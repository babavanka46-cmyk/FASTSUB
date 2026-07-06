export const captionPresets = [
  {
    id: "thai_creator",
    name: "Thai Creator",
    description: "ซับไตเติลสุดฮิตสำหรับครีเอเตอร์สาย Reels/Shorts/TikTok ตัวหนังสือหนาสีทองมีเงาเด่น",
    typography: {
      fontFamily: "Noto Sans Thai",
      fontSize: 46,
      fontWeight: 900,
      lineHeight: 1.35,
      letterSpacing: 0
    },
    fill: {
      textColor: "#f4c64f",
      activeColor: "#ffffff",
      inactiveOpacity: 0.9
    },
    stroke: {
      enabled: true,
      width: 1,
      color: "#050505"
    },
    shadow: {
      enabled: true,
      color: "#000000",
      blur: 10,
      offsetX: 0,
      offsetY: 4
    },
    background: {
      enabled: false,
      color: "#000000",
      opacity: 0.72,
      radius: 8,
      paddingX: 10,
      paddingY: 4
    },
    position: {
      verticalOffset: 25,
      align: "center",
      maxWidth: 86
    },
    karaoke: {
      mode: "word",
      activeScale: 1.1,
      activeColorMode: "fill",
      dimInactive: false
    },
    animation: {
      enter: "pop",
      active: "pulse",
      exit: "fade",
      durationMs: 180
    }
  },
  {
    id: "tiktok_bold",
    name: "TikTok Bold",
    description: "ฟอนต์ Prompt ตัวหนาสีเหลืองขอบดำคมชัดสะดุดสายตา สไตล์วิดีโอสั้นแนวตั้ง",
    typography: {
      fontFamily: "Prompt",
      fontSize: 48,
      fontWeight: 800,
      lineHeight: 1.35,
      letterSpacing: 0
    },
    fill: {
      textColor: "#ffeb3b",
      activeColor: "#ffffff",
      inactiveOpacity: 0.8
    },
    stroke: {
      enabled: true,
      width: 2.8,
      color: "#000000"
    },
    shadow: {
      enabled: false,
      color: "#000000",
      blur: 0,
      offsetX: 0,
      offsetY: 0
    },
    background: {
      enabled: false,
      color: "#000000",
      opacity: 0.6,
      radius: 6,
      paddingX: 8,
      paddingY: 3
    },
    position: {
      verticalOffset: 30,
      align: "center",
      maxWidth: 80
    },
    karaoke: {
      mode: "word",
      activeScale: 1.15,
      activeColorMode: "fill",
      dimInactive: true
    },
    animation: {
      enter: "bounce",
      active: "pulse",
      exit: "fade",
      durationMs: 200
    }
  },
  {
    id: "minimal_white",
    name: "Minimal White",
    description: "สไตล์เรียบง่ายคลาสสิก ตัวหนังสือสีขาวขอบบางเงาจางๆ สบายตา เหมาะกับ Vlog ทั่วไป",
    typography: {
      fontFamily: "Sarabun",
      fontSize: 40,
      fontWeight: 600,
      lineHeight: 1.35,
      letterSpacing: 0
    },
    fill: {
      textColor: "#ffffff",
      activeColor: "#ffcc00",
      inactiveOpacity: 1.0
    },
    stroke: {
      enabled: true,
      width: 2,
      color: "#111111"
    },
    shadow: {
      enabled: true,
      color: "#000000",
      blur: 6,
      offsetX: 0,
      offsetY: 2
    },
    background: {
      enabled: false,
      color: "#000000",
      opacity: 0.5,
      radius: 4,
      paddingX: 6,
      paddingY: 2
    },
    position: {
      verticalOffset: 20,
      align: "center",
      maxWidth: 90
    },
    karaoke: {
      mode: "none",
      activeScale: 1.0,
      activeColorMode: "fill",
      dimInactive: false
    },
    animation: {
      enter: "fade",
      active: "none",
      exit: "fade",
      durationMs: 150
    }
  },
  {
    id: "neon_glow",
    name: "Neon Glow",
    description: "ฟอนต์ Kanit เรืองแสงสไตล์ไซเบอร์พังก์ ล้อมรอบด้วยขอบเงาสีฟ้าสว่างนีออนสุดล้ำ",
    typography: {
      fontFamily: "Kanit",
      fontSize: 44,
      fontWeight: 800,
      lineHeight: 1.35,
      letterSpacing: 1
    },
    fill: {
      textColor: "#e0f7fa",
      activeColor: "#00e5ff",
      inactiveOpacity: 0.9
    },
    stroke: {
      enabled: true,
      width: 1,
      color: "#00b0ff"
    },
    shadow: {
      enabled: true,
      color: "#00b0ff",
      blur: 15,
      offsetX: 0,
      offsetY: 0
    },
    background: {
      enabled: false,
      color: "#000000",
      opacity: 0.7,
      radius: 8,
      paddingX: 10,
      paddingY: 4
    },
    position: {
      verticalOffset: 25,
      align: "center",
      maxWidth: 85
    },
    karaoke: {
      mode: "word",
      activeScale: 1.05,
      activeColorMode: "fill",
      dimInactive: false
    },
    animation: {
      enter: "pop",
      active: "pulse",
      exit: "fade",
      durationMs: 250
    }
  },
  {
    id: "boxed_caption",
    name: "Boxed Caption",
    description: "ซับตัวขาวพื้นหลังแถบดำทึบโปร่งแสงสไตล์สำนักข่าวพรีเมียม อ่านง่ายที่สุดในทุกพื้นผิววิดีโอ",
    typography: {
      fontFamily: "Noto Sans Thai",
      fontSize: 42,
      fontWeight: 700,
      lineHeight: 1.35,
      letterSpacing: 0
    },
    fill: {
      textColor: "#ffffff",
      activeColor: "#ffd54f",
      inactiveOpacity: 0.95
    },
    stroke: {
      enabled: false,
      width: 0,
      color: "#000000"
    },
    shadow: {
      enabled: false,
      color: "#000000",
      blur: 0,
      offsetX: 0,
      offsetY: 0
    },
    background: {
      enabled: true,
      color: "#000000",
      opacity: 0.7,
      radius: 6,
      paddingX: 12,
      paddingY: 4
    },
    position: {
      verticalOffset: 22,
      align: "center",
      maxWidth: 88
    },
    karaoke: {
      mode: "word",
      activeScale: 1.0,
      activeColorMode: "fill",
      dimInactive: false
    },
    animation: {
      enter: "fade",
      active: "none",
      exit: "fade",
      durationMs: 180
    }
  },
  {
    id: "podcast_clean",
    name: "Podcast Clean",
    description: "สไตล์เรียบหรูดูแพงแบบพอดแคสต์ ตัวหนังสือ Prompt กึ่งหนา ขอบบาง เงาละมุนตา",
    typography: {
      fontFamily: "Prompt",
      fontSize: 44,
      fontWeight: 700,
      lineHeight: 1.35,
      letterSpacing: 0
    },
    fill: {
      textColor: "#f5f5f5",
      activeColor: "#ff9800",
      inactiveOpacity: 1.0
    },
    stroke: {
      enabled: true,
      width: 2,
      color: "#1e1e1e"
    },
    shadow: {
      enabled: true,
      color: "#000000",
      blur: 8,
      offsetX: 0,
      offsetY: 3
    },
    background: {
      enabled: false,
      color: "#000000",
      opacity: 0.6,
      radius: 6,
      paddingX: 10,
      paddingY: 4
    },
    position: {
      verticalOffset: 20,
      align: "center",
      maxWidth: 82
    },
    karaoke: {
      mode: "word",
      activeScale: 1.05,
      activeColorMode: "fill",
      dimInactive: true
    },
    animation: {
      enter: "slideInUp",
      active: "none",
      exit: "fade",
      durationMs: 220
    }
  },
  {
    id: "news_lower_third",
    name: "News Lower Third",
    description: "สไตล์ข่าวสารแบบทางการ ฟอนต์ Sarabun ตัวหนาปานกลาง ขอบดำบาง อ่านง่าย ชัดเจน",
    typography: {
      fontFamily: "Sarabun",
      fontSize: 38,
      fontWeight: 700,
      lineHeight: 1.35,
      letterSpacing: 0
    },
    fill: {
      textColor: "#ffffff",
      activeColor: "#ffffff",
      inactiveOpacity: 1.0
    },
    stroke: {
      enabled: true,
      width: 2,
      color: "#000000"
    },
    shadow: {
      enabled: true,
      color: "#000000",
      blur: 4,
      offsetX: 1,
      offsetY: 1
    },
    background: {
      enabled: true,
      color: "#0b3c5d",
      opacity: 0.85,
      radius: 4,
      paddingX: 14,
      paddingY: 6
    },
    position: {
      verticalOffset: 12,
      align: "center",
      maxWidth: 90
    },
    karaoke: {
      mode: "none",
      activeScale: 1.0,
      activeColorMode: "fill",
      dimInactive: false
    },
    animation: {
      enter: "fade",
      active: "none",
      exit: "fade",
      durationMs: 150
    }
  },
  {
    id: "gaming_pop",
    name: "Gaming Pop",
    description: "ฟอนต์ Kanit สีสันจี๊ดจ๊าดขอบดำหนาและเงาฟุ้งสะดุดตาสไตล์เกมเมอร์/สตรีมเมอร์ตลก",
    typography: {
      fontFamily: "Kanit",
      fontSize: 48,
      fontWeight: 900,
      lineHeight: 1.35,
      letterSpacing: 0
    },
    fill: {
      textColor: "#00e676",
      activeColor: "#ffff00",
      inactiveOpacity: 0.95
    },
    stroke: {
      enabled: true,
      width: 3.2,
      color: "#121212"
    },
    shadow: {
      enabled: true,
      color: "#121212",
      blur: 8,
      offsetX: 3,
      offsetY: 3
    },
    background: {
      enabled: false,
      color: "#000000",
      opacity: 0.8,
      radius: 8,
      paddingX: 10,
      paddingY: 4
    },
    position: {
      verticalOffset: 28,
      align: "center",
      maxWidth: 84
    },
    karaoke: {
      mode: "word",
      activeScale: 1.2,
      activeColorMode: "fill",
      dimInactive: false
    },
    animation: {
      enter: "bounce",
      active: "pulse",
      exit: "fade",
      durationMs: 180
    }
  }
];
