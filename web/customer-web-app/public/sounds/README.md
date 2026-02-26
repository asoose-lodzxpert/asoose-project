# Notification Sounds

This directory contains audio files for push notifications.

## notification.mp3

**Important**: Replace the placeholder `notification.mp3` file with your own notification sound.

### Recommended Specifications

- **Format**: MP3 (best browser compatibility)
- **Duration**: 1-3 seconds
- **File Size**: < 100KB
- **Sample Rate**: 44.1 kHz or 48 kHz
- **Bit Rate**: 128 kbps or higher
- **Channels**: Mono or Stereo

### Alternative Formats

For broader compatibility, you can provide multiple formats:
- `notification.mp3` (required)
- `notification.ogg` (optional, for Firefox/Chrome)
- `notification.wav` (optional, but larger file size)

The app will automatically use the .mp3 file.

### Finding Notification Sounds

Free notification sound resources:
- [Freesound.org](https://freesound.org/) - Creative Commons sounds
- [Zapsplat.com](https://www.zapsplat.com/) - Free sound effects
- [Notification Sounds](https://notificationsounds.com/) - Dedicated notification sounds

### Creating Your Own

You can create a custom notification sound using:
- **Audacity** (free, open-source)
- **GarageBand** (Mac)
- **FL Studio** (Windows/Mac)
- **Online generators**: Multiple online tone generators available

### License

Ensure any sound file you use has appropriate licensing for your project.

### Testing Your Sound

After replacing the file:
1. Clear your browser cache
2. Reload the application
3. Grant notification permission
4. Click anywhere on the page (to unlock audio)
5. Trigger a test notification
6. Verify the new sound plays

For more details, see [NOTIFICATION_SOUND_GUIDE.md](../NOTIFICATION_SOUND_GUIDE.md) in the project root.
