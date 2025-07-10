# 📺 Ad Content Directory

Place your ad video/image files here for the DOOH system.

## 📋 Required Files

The system expects these specific files:

### 🎯 **Ad Types:**
- `neutral.gif` or `neutral.mp4` - Default/neutral content
- `man.gif` or `man.mp4` - Content targeted at male audience  
- `woman.gif` or `woman.mp4` - Content targeted at female audience

### 📝 **File Requirements:**
- **Format**: GIF, MP4, JPG, PNG
- **Size**: Recommended 1920x1080 or 1280x720
- **Duration**: 5-15 seconds for videos
- **File Size**: Keep under 50MB for web performance

## 🎬 **How Ads Are Triggered:**

1. **Neutral** - Default ad when no people detected
2. **Man** - When majority male audience detected
3. **Woman** - When majority female audience detected

## 🔄 **Ad Rotation:**
- Ads change every **5 seconds** automatically
- **3-second cooldown** prevents rapid changes
- Real-time targeting based on facial analysis 
- Manual ad forcing via dashboard
- **Fixed**: No more ad spam - controlled targeting

## 📁 **Example File Structure:**
```
public/ads/
├── neutral.gif
├── man.gif  
├── woman.gif
└── README.md (this file)
```

## 🚀 **Testing:**
1. Add your files to this directory
2. Restart the React frontend: `npm run dev`
3. Use the dashboard to force ad changes
4. Check real-time targeting in the analytics

---
**Current Ad Timer**: 5 seconds rotation 