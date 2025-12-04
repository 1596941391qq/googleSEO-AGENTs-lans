# Audio Files Setup

This folder contains audio files that play when analysis tasks complete.

## Setup Instructions

### 1. Add Your Audio File

Place your `stop.wav` file in this directory:
```
public/voice/stop.wav
```

### 2. Supported Audio Formats

The application uses the HTML5 Audio API, which supports:
- WAV (recommended for compatibility)
- MP3
- OGG
- AAC

### 3. Vercel Deployment

When deploying to Vercel, all files in the `public` folder are automatically served as static assets:

- ✅ The `public/voice/stop.wav` file will be accessible at `/voice/stop.wav`
- ✅ No additional configuration needed
- ✅ Vercel automatically serves files from the `public` directory

### 4. Local Development

During local development with `vercel dev` or `npm run dev:vercel`:
- Place your audio file in `public/voice/stop.wav`
- The file will be accessible at `http://localhost:3000/voice/stop.wav`
- Test by opening that URL in your browser

### 5. Testing

To test if the audio file is properly loaded:

1. Open your browser's Developer Console (F12)
2. Run this command:
   ```javascript
   new Audio('/voice/stop.wav').play()
   ```
3. You should hear the sound play

### 6. Troubleshooting

**Audio not playing?**

- **Browser autoplay restrictions**: Most browsers block autoplay with sound. The app sets volume to 50% and handles this gracefully.
- **File not found**: Check that the file is named exactly `stop.wav` (case-sensitive on some servers)
- **Wrong format**: Ensure your audio file is in a web-compatible format (WAV/MP3)
- **Check console**: Open Developer Console (F12) to see any error messages

**When audio plays:**

The completion sound plays when any of these tasks finish:
- ✅ Mining workflow finds a HIGH probability keyword
- ✅ Batch translation & analysis completes all keywords
- ✅ Deep dive strategy analysis completes

### 7. Customization

To use a different audio file name or format, edit `App.tsx`:

```typescript
const playCompletionSound = () => {
  try {
    const audio = new Audio('/voice/stop.wav');  // Change filename here
    audio.volume = 0.5;  // Adjust volume (0.0 to 1.0)
    audio.play().catch((error) => {
      console.log('Audio playback failed:', error);
    });
  } catch (error) {
    console.log('Audio initialization failed:', error);
  }
};
```

## File Structure

```
public/
└── voice/
    ├── README.md          (this file)
    └── stop.wav           (your audio file - add this)
```

---

**Note**: Don't forget to add your `stop.wav` file! The application will continue to work without it, but no sound will play.
