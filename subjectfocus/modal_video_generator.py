from __future__ import annotations

import modal
import json
from io import BytesIO

app = modal.App("podcast-video-generator")

# Use a pre-built image with multimedia libraries
image = (
    modal.Image.debian_slim()
    .apt_install("ffmpeg", "python3-pip")
    .pip_install(
        "Pillow",
        "httpx",
        "supabase",
        "fastapi[standard]",
        "imageio[ffmpeg]",
        "imageio-ffmpeg"
    )
)

@app.function(
    secrets=[
        modal.Secret.from_name("unsplash-key"),
        modal.Secret.from_name("supabase-creds")
    ],
    timeout=1800,
    image=image
)
@modal.fastapi_endpoint(method="POST")
def generate_video(data: dict):
    """Generate video without moviepy - use ffmpeg directly"""
    import os
    import httpx
    from PIL import Image, ImageDraw, ImageFont
    import subprocess
    import textwrap
    from supabase import create_client
    
    print("Starting video generation")
    
    try:
        slides = data.get('slides', [])
        audio_url = data.get('audio_url')
        podcast_id = data.get('podcast_id')
        
        if not slides or not audio_url or not podcast_id:
            return {'success': False, 'error': 'slides, audio_url, and podcast_id required'}
        
        supabase = create_client(
            os.environ["SUPABASE_URL"],
            os.environ["SUPABASE_SERVICE_KEY"]
        )
        
        print(f"Processing {len(slides)} slides")
        
        # Download audio
        audio_response = httpx.get(audio_url, timeout=60)
        audio_path = "/tmp/audio.mp3"
        with open(audio_path, "wb") as f:
            f.write(audio_response.content)
        
        # Get audio duration
        result = subprocess.run(
            ['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', audio_path],
            capture_output=True,
            text=True
        )
        audio_duration = float(result.stdout.strip())
        
        # Generate slides
        print("Generating slides...")
        slide_files = []
        total_slide_duration = sum(s.get('duration_seconds', 10) for s in slides)
        duration_multiplier = audio_duration / total_slide_duration
        
        for i, slide in enumerate(slides):
            bg = fetch_background_image(slide.get('image_search', 'abstract'), os.environ.get('UNSPLASH_ACCESS_KEY'))
            slide_img = render_slide(slide, bg)
            
            path = f"/tmp/slide_{i}.png"
            slide_img.save(path)
            
            duration = slide.get('duration_seconds', 10) * duration_multiplier
            slide_files.append((path, duration))
        
        # Create video with ffmpeg
        print("Creating video with ffmpeg...")
        
        # Create concat file
        with open('/tmp/concat.txt', 'w') as f:
            for path, duration in slide_files:
                f.write(f"file '{path}'\n")
                f.write(f"duration {duration}\n")
            # Repeat last slide
            f.write(f"file '{slide_files[-1][0]}'\n")
        
        # Run ffmpeg
        subprocess.run([
            'ffmpeg', '-f', 'concat', '-safe', '0', '-i', '/tmp/concat.txt',
            '-i', audio_path,
            '-c:v', 'libx264', '-c:a', 'aac',
            '-shortest', '-y', '/tmp/output.mp4'
        ], check=True)
        
        print("Video created!")
        
        # Upload to Supabase
        with open('/tmp/output.mp4', 'rb') as f:
            video_bytes = f.read()
        
        filename = f"{podcast_id}_video.mp4"
        supabase.storage.from_('podcast-audio').upload(
            filename,
            video_bytes,
            {'content-type': 'video/mp4', 'upsert': 'true'}
        )
        
        video_url = supabase.storage.from_('podcast-audio').get_public_url(filename)
        
        # Update DB
        supabase.table('podcasts').update({
            'video_url': video_url,
            'video_status': 'ready'
        }).eq('id', podcast_id).execute()
        
        return {
            'success': True,
            'video_url': video_url,
            'size_mb': round(len(video_bytes) / 1024 / 1024, 2)
        }
        
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return {'success': False, 'error': str(e)}


def fetch_background_image(search_query: str, api_key: str):
    import httpx
    from PIL import Image
    
    try:
        response = httpx.get(
            "https://api.unsplash.com/search/photos",
            params={"query": search_query, "orientation": "landscape", "per_page": 1},
            headers={"Authorization": f"Client-ID {api_key}"},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get('results'):
                img_url = data['results'][0]['urls']['regular']
                img_response = httpx.get(img_url, timeout=10)
                return Image.open(BytesIO(img_response.content)).resize((1920, 1080))
    except:
        pass
    
    from PIL import Image
    return Image.new('RGB', (1920, 1080), (44, 62, 80))


def render_slide(slide: dict, background):
    from PIL import Image, ImageDraw, ImageFont
    import textwrap
    
    img = background.copy()
    overlay = Image.new('RGBA', (1920, 1080), (0, 0, 0, 150))
    img.paste(overlay, (0, 0), overlay)
    
    draw = ImageDraw.Draw(img)
    
    try:
        title_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 80)
        text_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 50)
    except:
        title_font = ImageFont.load_default()
        text_font = ImageFont.load_default()
    
    slide_type = slide.get('slide_type', 'bullets')
    
    if slide_type == 'title':
        title = slide.get('title', '')
        bbox = draw.textbbox((0, 0), title, font=title_font)
        w = bbox[2] - bbox[0]
        draw.text(((1920 - w) // 2, 400), title, fill='white', font=title_font)
        
        if slide.get('subtitle'):
            subtitle = slide['subtitle']
            bbox = draw.textbbox((0, 0), subtitle, font=text_font)
            w = bbox[2] - bbox[0]
            draw.text(((1920 - w) // 2, 550), subtitle, fill='#ECF0F1', font=text_font)
    
    elif slide_type == 'bullets':
        y = 200
        draw.text((100, y), slide.get('title', ''), fill='white', font=title_font)
        y += 150
        
        for point in slide.get('content', []):
            wrapped = textwrap.fill(point, width=60)
            draw.text((150, y), f"• {wrapped}", fill='#ECF0F1', font=text_font)
            y += 100
    
    else:
        draw.text((100, 200), slide.get('title', ''), fill='white', font=title_font)
    
    return img