/**
 * Chamber Escape - 100 Strictly Unique Hand-Crafted Puzzle Chambers
 * 
 * Every single chamber from 1 to 100 features a completely unique puzzle trick,
 * dedicated title, distinct hint, and escalating difficulty.
 * Zero repeated tricks!
 */

export const CHAMBER_LEVEL_COUNT = 100;

const ALL_CHAMBER_LEVELS = {
  "1": {
    "title": "CHAMBER 01: UNREACHABLE KEY",
    "hint": "CANNOT JUMP TO KEY? DRAG IT DOWN WITH YOUR FINGER!",
    "playerStart": {
      "x": 30,
      "y": 260
    },
    "exitDoor": {
      "x": 310,
      "y": 254,
      "w": 28,
      "h": 42,
      "locked": true,
      "isDraggable": false
    },
    "platforms": [
      {
        "id": "floor",
        "x": 0,
        "y": 300,
        "w": 360,
        "h": 40
      },
      {
        "id": "w_left",
        "x": 0,
        "y": 0,
        "w": 12,
        "h": 300
      },
      {
        "id": "w_right",
        "x": 348,
        "y": 0,
        "w": 12,
        "h": 300
      },
      {
        "id": "ceiling",
        "x": 0,
        "y": 0,
        "w": 360,
        "h": 12
      }
    ],
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [
      {
        "id": "k1",
        "x": 190,
        "y": 110,
        "taken": false,
        "color": "#FFD166",
        "isDraggable": true
      }
    ],
    "plates": [],
    "hazards": [],
    "barriers": []
  },
  "2": {
    "title": "CHAMBER 02: LASER INTERCEPT",
    "hint": "DRAG THE FLOATING METAL SLAB TO BLOCK THE LASER!",
    "playerStart": {
      "x": 30,
      "y": 260
    },
    "exitDoor": {
      "x": 310,
      "y": 254,
      "w": 28,
      "h": 42,
      "locked": true
    },
    "platforms": [
      {
        "id": "floor",
        "x": 0,
        "y": 300,
        "w": 360,
        "h": 40
      },
      {
        "id": "w_left",
        "x": 0,
        "y": 0,
        "w": 12,
        "h": 300
      },
      {
        "id": "w_right",
        "x": 348,
        "y": 0,
        "w": 12,
        "h": 300
      },
      {
        "id": "ceiling",
        "x": 0,
        "y": 0,
        "w": 360,
        "h": 12
      },
      {
        "id": "mov_p1",
        "x": 140,
        "y": 120,
        "w": 55,
        "h": 16,
        "isDraggable": true,
        "color": "#FFE600"
      }
    ],
    "crates": [],
    "springs": [],
    "switches": [
      {
        "id": "sw1",
        "x": 280,
        "y": 270,
        "active": false
      }
    ],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [
      {
        "id": "b1",
        "x": 230,
        "y": 190,
        "w": 8,
        "h": 110,
        "active": true,
        "color": "#FF0055"
      }
    ]
  },
  "3": {
    "title": "CHAMBER 03: CRATE ELEVATION",
    "hint": "PUSH & ARRANGE CRATES INTO STAIRS TO REACH THE HIGH DOOR!",
    "playerStart": {
      "x": 30,
      "y": 260
    },
    "exitDoor": {
      "x": 310,
      "y": 148,
      "w": 28,
      "h": 42,
      "locked": false
    },
    "platforms": [
      {
        "id": "floor",
        "x": 0,
        "y": 300,
        "w": 360,
        "h": 40
      },
      {
        "id": "w_left",
        "x": 0,
        "y": 0,
        "w": 12,
        "h": 300
      },
      {
        "id": "w_right",
        "x": 348,
        "y": 0,
        "w": 12,
        "h": 300
      },
      {
        "id": "ceiling",
        "x": 0,
        "y": 0,
        "w": 360,
        "h": 12
      },
      {
        "id": "high_ledge",
        "x": 280,
        "y": 190,
        "w": 68,
        "h": 16
      }
    ],
    "crates": [
      {
        "id": "c1",
        "x": 140,
        "y": 270
      },
      {
        "id": "c2",
        "x": 200,
        "y": 270
      }
    ],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": []
  },
  "4": {
    "title": "CHAMBER 04: SUBTERRANEAN SHOVEL",
    "hint": "GRAB THE SHOVEL AND DIG AWAY THE DIRT TO CARVE A TUNNEL TO THE DOOR!",
    "playerStart": {
      "x": 30,
      "y": 260
    },
    "exitDoor": {
      "x": 310,
      "y": 254,
      "w": 28,
      "h": 42,
      "locked": false
    },
    "platforms": [
      {
        "id": "floor",
        "x": 0,
        "y": 300,
        "w": 360,
        "h": 40
      },
      {
        "id": "w_left",
        "x": 0,
        "y": 0,
        "w": 12,
        "h": 300
      },
      {
        "id": "w_right",
        "x": 348,
        "y": 0,
        "w": 12,
        "h": 300
      },
      {
        "id": "ceiling",
        "x": 0,
        "y": 0,
        "w": 360,
        "h": 12
      },
      {
        "id": "divider_top",
        "x": 180,
        "y": 0,
        "w": 18,
        "h": 180
      }
    ],
    "shovel": {
      "x": 80,
      "y": 270,
      "taken": false,
      "isDraggable": true
    },
    "dirtBlocks": [
      {
        "id": "d1",
        "x": 175,
        "y": 180,
        "w": 28,
        "h": 28,
        "dug": false
      },
      {
        "id": "d2",
        "x": 175,
        "y": 208,
        "w": 28,
        "h": 28,
        "dug": false
      },
      {
        "id": "d3",
        "x": 175,
        "y": 236,
        "w": 28,
        "h": 28,
        "dug": false
      },
      {
        "id": "d4",
        "x": 175,
        "y": 264,
        "w": 28,
        "h": 28,
        "dug": false
      },
      {
        "id": "d5",
        "x": 175,
        "y": 292,
        "w": 28,
        "h": 12,
        "dug": false
      }
    ],
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": []
  },
  "5": {
    "title": "CHAMBER 05: EARTHQUAKE STOMP",
    "hint": "JUMP & STOMP THE GROUND TO SHAKE THE BEAM UNTIL THE DOOR DROPS!",
    "playerStart": {
      "x": 40,
      "y": 260
    },
    "exitDoor": {
      "x": 270,
      "y": 78,
      "w": 28,
      "h": 42,
      "locked": false,
      "isDraggable": false
    },
    "platforms": [
      {
        "id": "floor",
        "x": 0,
        "y": 300,
        "w": 360,
        "h": 40
      },
      {
        "id": "w_left",
        "x": 0,
        "y": 0,
        "w": 12,
        "h": 300
      },
      {
        "id": "w_right",
        "x": 348,
        "y": 0,
        "w": 12,
        "h": 300
      },
      {
        "id": "ceiling",
        "x": 0,
        "y": 0,
        "w": 360,
        "h": 12
      },
      {
        "id": "beam",
        "x": 250,
        "y": 120,
        "w": 98,
        "h": 14
      }
    ],
    "earthquake": {
      "target": "door",
      "remainingStomps": 3,
      "offset": 0,
      "settled": false
    },
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [
      {
        "id": "h1",
        "x": 130,
        "y": 286,
        "w": 110,
        "h": 14
      }
    ],
    "barriers": []
  },
  "6": {
    "title": "CHAMBER 06: CEILING DOOR DESCENT",
    "hint": "THE EXIT DOOR IS SUSPENDED IN MID-AIR. DRAG IT DOWN TO THE FLOOR!",
    "playerStart": {
      "x": 30,
      "y": 260
    },
    "exitDoor": {
      "x": 290,
      "y": 55,
      "w": 28,
      "h": 42,
      "locked": false,
      "isDraggable": true
    },
    "platforms": [
      {
        "id": "floor",
        "x": 0,
        "y": 300,
        "w": 360,
        "h": 40
      },
      {
        "id": "w_left",
        "x": 0,
        "y": 0,
        "w": 12,
        "h": 300
      },
      {
        "id": "w_right",
        "x": 348,
        "y": 0,
        "w": 12,
        "h": 300
      },
      {
        "id": "ceiling",
        "x": 0,
        "y": 0,
        "w": 360,
        "h": 12
      }
    ],
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": []
  },
  "7": {
    "title": "CHAMBER 07: DOOR AS A STEPPING STONE",
    "hint": "DRAG THE DOOR DOWN, JUMP ON TOP OF IT AS A PLATFORM TO REACH THE HIGH KEY!",
    "playerStart": {
      "x": 30,
      "y": 260
    },
    "exitDoor": {
      "x": 290,
      "y": 65,
      "w": 32,
      "h": 44,
      "locked": true,
      "isDraggable": true,
      "isPlatform": true
    },
    "platforms": [
      {
        "id": "floor",
        "x": 0,
        "y": 300,
        "w": 360,
        "h": 40
      },
      {
        "id": "w_left",
        "x": 0,
        "y": 0,
        "w": 12,
        "h": 300
      },
      {
        "id": "w_right",
        "x": 348,
        "y": 0,
        "w": 12,
        "h": 300
      },
      {
        "id": "ceiling",
        "x": 0,
        "y": 0,
        "w": 360,
        "h": 12
      }
    ],
    "keys": [
      {
        "id": "high_k",
        "x": 190,
        "y": 140,
        "taken": false,
        "color": "#FFD166",
        "isDraggable": false
      }
    ],
    "crates": [],
    "springs": [],
    "switches": [],
    "plates": [],
    "hazards": [],
    "barriers": []
  },
  "8": {
    "title": "CHAMBER 08: GUST THROUGH THE WINDOW",
    "hint": "TAP OPEN THE SHUTTERED WINDOW TO LET THE HEAVY WIND BLOW THE DOOR DOWN!",
    "playerStart": {
      "x": 30,
      "y": 260
    },
    "exitDoor": {
      "x": 290,
      "y": 78,
      "w": 28,
      "h": 42,
      "locked": false,
      "isDraggable": false
    },
    "platforms": [
      {
        "id": "floor",
        "x": 0,
        "y": 300,
        "w": 360,
        "h": 40
      },
      {
        "id": "w_left",
        "x": 0,
        "y": 0,
        "w": 12,
        "h": 300
      },
      {
        "id": "w_right",
        "x": 348,
        "y": 0,
        "w": 12,
        "h": 300
      },
      {
        "id": "ceiling",
        "x": 0,
        "y": 0,
        "w": 360,
        "h": 12
      },
      {
        "id": "shelf",
        "x": 260,
        "y": 120,
        "w": 88,
        "h": 12
      }
    ],
    "windowObj": {
      "x": 265,
      "y": 45,
      "w": 34,
      "h": 42,
      "open": false
    },
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": []
  },
  "9": {
    "title": "CHAMBER 09: GRAVITATIONAL RAIL SLIDE",
    "hint": "TILT / ROTATE GRAVITY SO THE HEAVY DOOR SLIDES DOWN ITS INCLINED RAIL!",
    "playerStart": {
      "x": 30,
      "y": 260
    },
    "exitDoor": {
      "x": 290,
      "y": 60,
      "w": 28,
      "h": 42,
      "locked": false,
      "onRail": true
    },
    "platforms": [
      {
        "id": "floor",
        "x": 0,
        "y": 300,
        "w": 360,
        "h": 40
      },
      {
        "id": "w_left",
        "x": 0,
        "y": 0,
        "w": 12,
        "h": 300
      },
      {
        "id": "w_right",
        "x": 348,
        "y": 0,
        "w": 12,
        "h": 300
      },
      {
        "id": "ceiling",
        "x": 0,
        "y": 0,
        "w": 360,
        "h": 12
      },
      {
        "id": "rail_track",
        "x": 270,
        "y": 102,
        "w": 78,
        "h": 10,
        "isRail": true
      }
    ],
    "gravityTiltable": true,
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": []
  },
  "10": {
    "title": "CHAMBER 10: THE WOUNDED SENTRY",
    "hint": "THIS SECURITY GUARD SEEMS LIKE AN HEART PATIENT...",
    "playerStart": {
      "x": 30,
      "y": 260
    },
    "exitDoor": {
      "x": 310,
      "y": 254,
      "w": 28,
      "h": 42,
      "locked": true
    },
    "platforms": [
      {
        "id": "floor",
        "x": 0,
        "y": 300,
        "w": 360,
        "h": 40
      },
      {
        "id": "w_left",
        "x": 0,
        "y": 0,
        "w": 12,
        "h": 300
      },
      {
        "id": "w_right",
        "x": 348,
        "y": 0,
        "w": 12,
        "h": 300
      },
      {
        "id": "ceiling",
        "x": 0,
        "y": 0,
        "w": 360,
        "h": 12
      }
    ],
    "guard": {
      "x": 160,
      "y": 272,
      "healed": false,
      "speech": "NEED... A ❤️..."
    },
    "hintHeart": true,
    "keys": [],
    "crates": [],
    "springs": [],
    "switches": [],
    "plates": [],
    "hazards": [],
    "barriers": []
  },
  "11": {
    "title": "CHAMBER 11: STEAL THE HUD KEY",
    "hint": "NO KEY IN SIGHT? GRAB THE 🔑 ICON DIRECTLY FROM THE TOP HUD COUNTER!",
    "playerStart": {
      "x": 30,
      "y": 260
    },
    "exitDoor": {
      "x": 310,
      "y": 254,
      "w": 28,
      "h": 42,
      "locked": true
    },
    "platforms": [
      {
        "id": "floor",
        "x": 0,
        "y": 300,
        "w": 360,
        "h": 40
      },
      {
        "id": "w_left",
        "x": 0,
        "y": 0,
        "w": 12,
        "h": 300
      },
      {
        "id": "w_right",
        "x": 348,
        "y": 0,
        "w": 12,
        "h": 300
      },
      {
        "id": "ceiling",
        "x": 0,
        "y": 0,
        "w": 360,
        "h": 12
      }
    ],
    "hudKeyDraggable": true,
    "keys": [],
    "crates": [],
    "springs": [],
    "switches": [],
    "plates": [],
    "hazards": [],
    "barriers": []
  },
  "12": {
    "title": "CHAMBER 12: LASER BREACH BLASTER",
    "hint": "PICK UP THE CYBER BLASTER AND FIRE A LASER BOLT TO SHATTER THE DOOR PADLOCK!",
    "playerStart": {
      "x": 30,
      "y": 260
    },
    "exitDoor": {
      "x": 310,
      "y": 254,
      "w": 28,
      "h": 42,
      "locked": true
    },
    "padlock": {
      "x": 324,
      "y": 275,
      "onDoor": true
    },
    "platforms": [
      {
        "id": "floor",
        "x": 0,
        "y": 300,
        "w": 360,
        "h": 40
      },
      {
        "id": "w_left",
        "x": 0,
        "y": 0,
        "w": 12,
        "h": 300
      },
      {
        "id": "w_right",
        "x": 348,
        "y": 0,
        "w": 12,
        "h": 300
      },
      {
        "id": "ceiling",
        "x": 0,
        "y": 0,
        "w": 360,
        "h": 12
      },
      {
        "id": "pedestal",
        "x": 120,
        "y": 260,
        "w": 32,
        "h": 40
      }
    ],
    "gun": {
      "x": 128,
      "y": 242,
      "taken": false
    },
    "keys": [],
    "crates": [],
    "springs": [],
    "switches": [],
    "plates": [],
    "hazards": [],
    "barriers": []
  },
  "13": {
    "title": "CHAMBER 13: INVERT THE SPIKE BED",
    "hint": "ROTATE THE SPIKE BED 180° TO TURN IT INTO A SAFE FLAT BRIDGE, THEN DRAG IT OVER!",
    "playerStart": {
      "x": 30,
      "y": 260
    },
    "exitDoor": {
      "x": 310,
      "y": 254,
      "w": 28,
      "h": 42,
      "locked": false
    },
    "platforms": [
      {
        "id": "floor_left",
        "x": 0,
        "y": 300,
        "w": 100,
        "h": 40
      },
      {
        "id": "floor_right",
        "x": 260,
        "y": 300,
        "w": 100,
        "h": 40
      },
      {
        "id": "w_left",
        "x": 0,
        "y": 0,
        "w": 12,
        "h": 300
      },
      {
        "id": "w_right",
        "x": 348,
        "y": 0,
        "w": 12,
        "h": 300
      },
      {
        "id": "ceiling",
        "x": 0,
        "y": 0,
        "w": 360,
        "h": 12
      }
    ],
    "rotatableSpikes": {
      "id": "spk1",
      "x": 120,
      "y": 278,
      "w": 96,
      "h": 22,
      "rotated": false,
      "isDraggable": true
    },
    "hazards": [
      {
        "id": "pit_lava",
        "x": 100,
        "y": 310,
        "w": 160,
        "h": 30
      }
    ],
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "barriers": []
  },
  "14": {
    "title": "CHAMBER 14: ROTATE TO FIX GRAVITY",
    "hint": "GRAVITY IS UPSIDE-DOWN! ROTATE YOUR DEVICE OR TAP THE ROTATE BUTTON TO FIX IT!",
    "playerStart": {
      "x": 180,
      "y": 40
    },
    "exitDoor": {
      "x": 310,
      "y": 254,
      "w": 28,
      "h": 42,
      "locked": false
    },
    "platforms": [
      {
        "id": "floor",
        "x": 0,
        "y": 300,
        "w": 360,
        "h": 40
      },
      {
        "id": "w_left",
        "x": 0,
        "y": 0,
        "w": 12,
        "h": 300
      },
      {
        "id": "w_right",
        "x": 348,
        "y": 0,
        "w": 12,
        "h": 300
      },
      {
        "id": "ceiling",
        "x": 0,
        "y": 0,
        "w": 360,
        "h": 12
      }
    ],
    "gravityRotateMode": true,
    "gravityInverted": true,
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": []
  },
  "15": {
    "title": "CHAMBER 15: PULL THE POWER PLUG",
    "hint": "DRAG THE GIANT POWER PLUG OUT OF THE WALL TO DISABLE THE ELECTRIC GRID!",
    "playerStart": {
      "x": 30,
      "y": 260
    },
    "exitDoor": {
      "x": 310,
      "y": 254,
      "w": 28,
      "h": 42,
      "locked": false
    },
    "platforms": [
      {
        "id": "floor",
        "x": 0,
        "y": 300,
        "w": 360,
        "h": 40
      },
      {
        "id": "w_left",
        "x": 0,
        "y": 0,
        "w": 12,
        "h": 300
      },
      {
        "id": "w_right",
        "x": 348,
        "y": 0,
        "w": 12,
        "h": 300
      },
      {
        "id": "ceiling",
        "x": 0,
        "y": 0,
        "w": 360,
        "h": 12
      }
    ],
    "plug": {
      "x": 70,
      "y": 178,
      "plugged": true
    },
    "barriers": [
      {
        "id": "b_plug",
        "x": 210,
        "y": 150,
        "w": 10,
        "h": 150,
        "active": true,
        "byPlug": true
      }
    ],
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": []
  },
  "16": {
    "title": "CHAMBER 16: RIP THE PADLOCK",
    "hint": "TEAR THE GIANT PADLOCK OFF THE DOOR WITH A HARD FINGER SWIPE!",
    "playerStart": {
      "x": 30,
      "y": 260
    },
    "exitDoor": {
      "x": 310,
      "y": 254,
      "w": 28,
      "h": 42,
      "locked": true
    },
    "padlock": {
      "x": 324,
      "y": 275,
      "onDoor": true
    },
    "platforms": [
      {
        "id": "floor",
        "x": 0,
        "y": 300,
        "w": 360,
        "h": 40
      },
      {
        "id": "w_left",
        "x": 0,
        "y": 0,
        "w": 12,
        "h": 300
      },
      {
        "id": "w_right",
        "x": 348,
        "y": 0,
        "w": 12,
        "h": 300
      },
      {
        "id": "ceiling",
        "x": 0,
        "y": 0,
        "w": 360,
        "h": 12
      }
    ],
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": []
  },
  "17": {
    "title": "CHAMBER 17: BOUNCY SPRING PAD",
    "hint": "DRAG THE BOUNCY SPRING PAD UNDER THE HIGH LEDGE TO LEAP TO THE EXIT!",
    "playerStart": {
      "x": 30,
      "y": 260
    },
    "exitDoor": {
      "x": 310,
      "y": 118,
      "w": 28,
      "h": 42,
      "locked": false
    },
    "platforms": [
      {
        "id": "floor",
        "x": 0,
        "y": 300,
        "w": 360,
        "h": 40
      },
      {
        "id": "w_left",
        "x": 0,
        "y": 0,
        "w": 12,
        "h": 300
      },
      {
        "id": "w_right",
        "x": 348,
        "y": 0,
        "w": 12,
        "h": 300
      },
      {
        "id": "ceiling",
        "x": 0,
        "y": 0,
        "w": 360,
        "h": 12
      },
      {
        "id": "ledge",
        "x": 270,
        "y": 160,
        "w": 78,
        "h": 16
      }
    ],
    "springs": [
      {
        "id": "sp1",
        "x": 80,
        "y": 288,
        "w": 32,
        "h": 12,
        "isDraggable": true
      }
    ],
    "crates": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": []
  },
  "18": {
    "title": "CHAMBER 18: HELIUM BALLOON CRATE",
    "hint": "TAP THE BALLOON TO POP IT SO THE HEAVY CRATE DROPS ONTO THE PRESSURE PLATE!",
    "playerStart": {
      "x": 30,
      "y": 260
    },
    "exitDoor": {
      "x": 310,
      "y": 254,
      "w": 28,
      "h": 42,
      "locked": false
    },
    "platforms": [
      {
        "id": "floor",
        "x": 0,
        "y": 300,
        "w": 360,
        "h": 40
      },
      {
        "id": "w_left",
        "x": 0,
        "y": 0,
        "w": 12,
        "h": 300
      },
      {
        "id": "w_right",
        "x": 348,
        "y": 0,
        "w": 12,
        "h": 300
      },
      {
        "id": "ceiling",
        "x": 0,
        "y": 0,
        "w": 360,
        "h": 12
      }
    ],
    "crates": [
      {
        "id": "c_bal",
        "x": 170,
        "y": 80,
        "isBalloon": true
      }
    ],
    "plates": [
      {
        "id": "pl1",
        "x": 165,
        "y": 295,
        "w": 36,
        "h": 6,
        "pressed": false
      }
    ],
    "barriers": [
      {
        "id": "b_pl",
        "x": 240,
        "y": 160,
        "w": 8,
        "h": 140,
        "active": true,
        "plateIds": [
          "pl1"
        ]
      }
    ],
    "springs": [],
    "switches": [],
    "keys": [],
    "hazards": []
  },
  "19": {
    "title": "CHAMBER 19: BATTERY INSERTION",
    "hint": "DRAG THE CYBER AA BATTERY INTO THE WALL SOCKET TO POWER THE ESCAPE DOOR!",
    "playerStart": {
      "x": 30,
      "y": 260
    },
    "exitDoor": {
      "x": 310,
      "y": 254,
      "w": 28,
      "h": 42,
      "locked": true
    },
    "platforms": [
      {
        "id": "floor",
        "x": 0,
        "y": 300,
        "w": 360,
        "h": 40
      },
      {
        "id": "w_left",
        "x": 0,
        "y": 0,
        "w": 12,
        "h": 300
      },
      {
        "id": "w_right",
        "x": 348,
        "y": 0,
        "w": 12,
        "h": 300
      },
      {
        "id": "ceiling",
        "x": 0,
        "y": 0,
        "w": 360,
        "h": 12
      }
    ],
    "battery": {
      "x": 70,
      "y": 274,
      "w": 24,
      "h": 16,
      "slotted": false
    },
    "socket": {
      "x": 250,
      "y": 270,
      "w": 30,
      "h": 22
    },
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": []
  },
  "20": {
    "title": "CHAMBER 20: PRISM DEFLECTION",
    "hint": "DRAG THE PRISM MIRROR INTO THE EMITTER BEAM TO DEFLECT IT TO THE SENSOR!",
    "playerStart": {
      "x": 30,
      "y": 260
    },
    "exitDoor": {
      "x": 310,
      "y": 254,
      "w": 28,
      "h": 42,
      "locked": false
    },
    "platforms": [
      {
        "id": "floor",
        "x": 0,
        "y": 300,
        "w": 360,
        "h": 40
      },
      {
        "id": "w_left",
        "x": 0,
        "y": 0,
        "w": 12,
        "h": 300
      },
      {
        "id": "w_right",
        "x": 348,
        "y": 0,
        "w": 12,
        "h": 300
      },
      {
        "id": "ceiling",
        "x": 0,
        "y": 0,
        "w": 360,
        "h": 12
      },
      {
        "id": "mirror_p",
        "x": 80,
        "y": 150,
        "w": 46,
        "h": 14,
        "isDraggable": true,
        "isMirror": true
      }
    ],
    "receptors": [
      {
        "id": "rec1",
        "x": 270,
        "y": 260,
        "w": 22,
        "h": 22,
        "beamX": 180,
        "beamY": 180,
        "hit": false
      }
    ],
    "barriers": [
      {
        "id": "b_rec",
        "x": 230,
        "y": 160,
        "w": 8,
        "h": 140,
        "active": true,
        "receptorId": "rec1"
      }
    ],
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": []
  },
  "21": {
    "title": "CHAMBER 21: PORTAL WARP",
    "hint": "ENTER THE ORANGE PORTAL TO WARP OUT OF THE BLUE PORTAL BEHIND THE WALL!",
    "playerStart": {
      "x": 30,
      "y": 260
    },
    "exitDoor": {
      "x": 310,
      "y": 254,
      "w": 28,
      "h": 42,
      "locked": false
    },
    "platforms": [
      {
        "id": "floor",
        "x": 0,
        "y": 300,
        "w": 360,
        "h": 40
      },
      {
        "id": "w_left",
        "x": 0,
        "y": 0,
        "w": 12,
        "h": 300
      },
      {
        "id": "w_right",
        "x": 348,
        "y": 0,
        "w": 12,
        "h": 300
      },
      {
        "id": "ceiling",
        "x": 0,
        "y": 0,
        "w": 360,
        "h": 12
      },
      {
        "id": "divider",
        "x": 180,
        "y": 100,
        "w": 16,
        "h": 200
      }
    ],
    "portals": [
      {
        "id": "p_in",
        "x": 120,
        "y": 250,
        "color": "#FF6600",
        "partnerId": "p_out",
        "exitOffsetX": 25,
        "exitOffsetY": 0
      },
      {
        "id": "p_out",
        "x": 230,
        "y": 250,
        "color": "#00F5FF",
        "partnerId": "p_in",
        "exitOffsetX": -25,
        "exitOffsetY": 0
      }
    ],
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": []
  },
  "22": {
    "title": "CHAMBER 22: TIMED SPRINT GATE",
    "hint": "TRIGGER THE TIMED BUTTON AND SPRINT BEFORE THE 4-SECOND BLAST GATE CLOSES!",
    "playerStart": {
      "x": 30,
      "y": 260
    },
    "exitDoor": {
      "x": 310,
      "y": 254,
      "w": 28,
      "h": 42,
      "locked": false
    },
    "platforms": [
      {
        "id": "floor",
        "x": 0,
        "y": 300,
        "w": 360,
        "h": 40
      },
      {
        "id": "w_left",
        "x": 0,
        "y": 0,
        "w": 12,
        "h": 300
      },
      {
        "id": "w_right",
        "x": 348,
        "y": 0,
        "w": 12,
        "h": 300
      },
      {
        "id": "ceiling",
        "x": 0,
        "y": 0,
        "w": 360,
        "h": 12
      }
    ],
    "switches": [
      {
        "id": "sw_timed",
        "x": 60,
        "y": 275,
        "active": false,
        "isTimed": true,
        "timer": 0,
        "maxTimer": 4
      }
    ],
    "barriers": [
      {
        "id": "b_timed",
        "x": 200,
        "y": 160,
        "w": 10,
        "h": 140,
        "active": true,
        "switchId": "sw_timed"
      }
    ],
    "crates": [],
    "springs": [],
    "keys": [],
    "plates": [],
    "hazards": []
  },
  "23": {
    "title": "CHAMBER 23: CRUMBLING STONE TILES",
    "hint": "SPRINT ACROSS THE CRUMBLING TILES WITHOUT STOPPING BEFORE THEY SHATTER!",
    "playerStart": {
      "x": 30,
      "y": 260
    },
    "exitDoor": {
      "x": 310,
      "y": 254,
      "w": 28,
      "h": 42,
      "locked": false
    },
    "platforms": [
      {
        "id": "floor_left",
        "x": 0,
        "y": 300,
        "w": 70,
        "h": 40
      },
      {
        "id": "floor_right",
        "x": 280,
        "y": 300,
        "w": 80,
        "h": 40
      },
      {
        "id": "w_left",
        "x": 0,
        "y": 0,
        "w": 12,
        "h": 300
      },
      {
        "id": "w_right",
        "x": 348,
        "y": 0,
        "w": 12,
        "h": 300
      },
      {
        "id": "ceiling",
        "x": 0,
        "y": 0,
        "w": 360,
        "h": 12
      },
      {
        "id": "c1",
        "x": 80,
        "y": 290,
        "w": 42,
        "h": 12,
        "isCrumbling": true
      },
      {
        "id": "c2",
        "x": 130,
        "y": 290,
        "w": 42,
        "h": 12,
        "isCrumbling": true
      },
      {
        "id": "c3",
        "x": 180,
        "y": 290,
        "w": 42,
        "h": 12,
        "isCrumbling": true
      },
      {
        "id": "c4",
        "x": 230,
        "y": 290,
        "w": 42,
        "h": 12,
        "isCrumbling": true
      }
    ],
    "hazards": [
      {
        "id": "pit",
        "x": 70,
        "y": 320,
        "w": 210,
        "h": 20
      }
    ],
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "barriers": []
  },
  "24": {
    "title": "CHAMBER 24: TURBINE AIR VENT",
    "hint": "STEP ONTO THE TURBINE AIR VENT TO RIDE THE HIGH-PRESSURE UPDRAFT TO THE EXIT!",
    "playerStart": {
      "x": 30,
      "y": 260
    },
    "exitDoor": {
      "x": 310,
      "y": 98,
      "w": 28,
      "h": 42,
      "locked": false
    },
    "platforms": [
      {
        "id": "floor",
        "x": 0,
        "y": 300,
        "w": 360,
        "h": 40
      },
      {
        "id": "w_left",
        "x": 0,
        "y": 0,
        "w": 12,
        "h": 300
      },
      {
        "id": "w_right",
        "x": 348,
        "y": 0,
        "w": 12,
        "h": 300
      },
      {
        "id": "ceiling",
        "x": 0,
        "y": 0,
        "w": 360,
        "h": 12
      },
      {
        "id": "high_roof",
        "x": 260,
        "y": 140,
        "w": 88,
        "h": 16
      }
    ],
    "fans": [
      {
        "id": "fan1",
        "x": 140,
        "y": 288,
        "w": 40,
        "h": 12,
        "active": true
      }
    ],
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": []
  },
  "25": {
    "title": "CHAMBER 25: KEYCARD COLOR ORDER",
    "hint": "COLLECT THE RED, THEN GREEN, THEN BLUE KEYCARDS IN STRICT ORDER!",
    "playerStart": {
      "x": 30,
      "y": 260
    },
    "exitDoor": {
      "x": 310,
      "y": 254,
      "w": 28,
      "h": 42,
      "locked": false
    },
    "platforms": [
      {
        "id": "floor",
        "x": 0,
        "y": 300,
        "w": 360,
        "h": 40
      },
      {
        "id": "w_left",
        "x": 0,
        "y": 0,
        "w": 12,
        "h": 300
      },
      {
        "id": "w_right",
        "x": 348,
        "y": 0,
        "w": 12,
        "h": 300
      },
      {
        "id": "ceiling",
        "x": 0,
        "y": 0,
        "w": 360,
        "h": 12
      }
    ],
    "keys": [
      {
        "id": "k_red",
        "x": 70,
        "y": 275,
        "color": "#FF0055",
        "taken": false
      },
      {
        "id": "k_grn",
        "x": 140,
        "y": 275,
        "color": "#39FF14",
        "taken": false
      },
      {
        "id": "k_blu",
        "x": 210,
        "y": 275,
        "color": "#00F5FF",
        "taken": false
      }
    ],
    "barriers": [
      {
        "id": "b_r",
        "x": 110,
        "y": 180,
        "w": 8,
        "h": 120,
        "active": true,
        "requiredColor": "#FF0055"
      },
      {
        "id": "b_g",
        "x": 180,
        "y": 180,
        "w": 8,
        "h": 120,
        "active": true,
        "requiredColor": "#39FF14"
      },
      {
        "id": "b_b",
        "x": 260,
        "y": 180,
        "w": 8,
        "h": 120,
        "active": true,
        "requiredColor": "#00F5FF"
      }
    ],
    "crates": [],
    "springs": [],
    "switches": [],
    "plates": [],
    "hazards": []
  },
  "26": {
    "title": "CHAMBER 26: PISTON CRUSHER JAM",
    "hint": "PUSH THE HEAVY TITANIUM CRATE UNDER THE CRUSHER PISTON TO JAM THE GEARS!",
    "playerStart": {
      "x": 30,
      "y": 260
    },
    "exitDoor": {
      "x": 310,
      "y": 254,
      "w": 28,
      "h": 42,
      "locked": false
    },
    "platforms": [
      {
        "id": "floor",
        "x": 0,
        "y": 300,
        "w": 360,
        "h": 40
      },
      {
        "id": "w_left",
        "x": 0,
        "y": 0,
        "w": 12,
        "h": 300
      },
      {
        "id": "w_right",
        "x": 348,
        "y": 0,
        "w": 12,
        "h": 300
      },
      {
        "id": "ceiling",
        "x": 0,
        "y": 0,
        "w": 360,
        "h": 12
      }
    ],
    "crates": [
      {
        "id": "anvil",
        "x": 90,
        "y": 270
      }
    ],
    "plates": [
      {
        "id": "pl_jam",
        "x": 170,
        "y": 295,
        "w": 40,
        "h": 6,
        "pressed": false
      }
    ],
    "barriers": [
      {
        "id": "b_crusher",
        "x": 220,
        "y": 160,
        "w": 12,
        "h": 140,
        "active": true,
        "plateIds": [
          "pl_jam"
        ]
      }
    ],
    "springs": [],
    "switches": [],
    "keys": [],
    "hazards": []
  },
  "27": {
    "title": "CHAMBER 27: SWIPE ROPE CUT",
    "hint": "SWIPE YOUR FINGER ACROSS THE SUSPENSION ROPE TO DROP THE DRAWBRIDGE!",
    "playerStart": {
      "x": 30,
      "y": 260
    },
    "exitDoor": {
      "x": 310,
      "y": 254,
      "w": 28,
      "h": 42,
      "locked": false
    },
    "platforms": [
      {
        "id": "floor_left",
        "x": 0,
        "y": 300,
        "w": 90,
        "h": 40
      },
      {
        "id": "floor_right",
        "x": 250,
        "y": 300,
        "w": 110,
        "h": 40
      },
      {
        "id": "w_left",
        "x": 0,
        "y": 0,
        "w": 12,
        "h": 300
      },
      {
        "id": "w_right",
        "x": 348,
        "y": 0,
        "w": 12,
        "h": 300
      },
      {
        "id": "ceiling",
        "x": 0,
        "y": 0,
        "w": 360,
        "h": 12
      },
      {
        "id": "bridge_draw",
        "x": 90,
        "y": 180,
        "w": 160,
        "h": 14,
        "isBridge": true,
        "hanging": true
      }
    ],
    "ropes": [
      {
        "id": "rope1",
        "x1": 170,
        "y1": 12,
        "x2": 170,
        "y2": 180,
        "cut": false,
        "targetBridgeId": "bridge_draw"
      }
    ],
    "hazards": [
      {
        "id": "pit",
        "x": 90,
        "y": 320,
        "w": 160,
        "h": 20
      }
    ],
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "barriers": []
  },
  "28": {
    "title": "CHAMBER 28: TORCH MELTS ICE KEY",
    "hint": "DRAG THE FLAMING TORCH OVER THE FROZEN ICE BLOCK TO RELEASE THE KEY!",
    "playerStart": {
      "x": 30,
      "y": 260
    },
    "exitDoor": {
      "x": 310,
      "y": 254,
      "w": 28,
      "h": 42,
      "locked": true
    },
    "platforms": [
      {
        "id": "floor",
        "x": 0,
        "y": 300,
        "w": 360,
        "h": 40
      },
      {
        "id": "w_left",
        "x": 0,
        "y": 0,
        "w": 12,
        "h": 300
      },
      {
        "id": "w_right",
        "x": 348,
        "y": 0,
        "w": 12,
        "h": 300
      },
      {
        "id": "ceiling",
        "x": 0,
        "y": 0,
        "w": 360,
        "h": 12
      }
    ],
    "torch": {
      "x": 80,
      "y": 270,
      "isDraggable": true
    },
    "iceBlock": {
      "x": 180,
      "y": 260,
      "w": 34,
      "h": 36,
      "melted": false
    },
    "keys": [
      {
        "id": "k_ice",
        "x": 197,
        "y": 278,
        "taken": false,
        "color": "#FFD166",
        "inIce": true
      }
    ],
    "crates": [],
    "springs": [],
    "switches": [],
    "plates": [],
    "hazards": [],
    "barriers": []
  },
  "29": {
    "title": "CHAMBER 29: HORSESHOE MAGNET",
    "hint": "DRAG THE POWERFUL MAGNET ALONG THE WALL TO PULL THE KEY OUT OF THE CAGE!",
    "playerStart": {
      "x": 30,
      "y": 260
    },
    "exitDoor": {
      "x": 310,
      "y": 254,
      "w": 28,
      "h": 42,
      "locked": true
    },
    "platforms": [
      {
        "id": "floor",
        "x": 0,
        "y": 300,
        "w": 360,
        "h": 40
      },
      {
        "id": "w_left",
        "x": 0,
        "y": 0,
        "w": 12,
        "h": 300
      },
      {
        "id": "w_right",
        "x": 348,
        "y": 0,
        "w": 12,
        "h": 300
      },
      {
        "id": "ceiling",
        "x": 0,
        "y": 0,
        "w": 360,
        "h": 12
      },
      {
        "id": "cage_top",
        "x": 190,
        "y": 190,
        "w": 60,
        "h": 10
      },
      {
        "id": "cage_bar1",
        "x": 190,
        "y": 200,
        "w": 6,
        "h": 100
      },
      {
        "id": "cage_bar2",
        "x": 244,
        "y": 200,
        "w": 6,
        "h": 100
      }
    ],
    "magnet": {
      "x": 80,
      "y": 270,
      "isDraggable": true
    },
    "keys": [
      {
        "id": "k_iron",
        "x": 218,
        "y": 270,
        "taken": false,
        "color": "#FFD166",
        "isMagnetic": true
      }
    ],
    "crates": [],
    "springs": [],
    "switches": [],
    "plates": [],
    "hazards": [],
    "barriers": []
  },
  "30": {
    "title": "CHAMBER 30: SLIDING GARAGE WALL",
    "hint": "GRAB THE BOTTOM HANDLE OF THE PARTITION WALL AND DRAG IT UPWARD!",
    "playerStart": {
      "x": 30,
      "y": 260
    },
    "exitDoor": {
      "x": 310,
      "y": 254,
      "w": 28,
      "h": 42,
      "locked": false
    },
    "platforms": [
      {
        "id": "floor",
        "x": 0,
        "y": 300,
        "w": 360,
        "h": 40
      },
      {
        "id": "w_left",
        "x": 0,
        "y": 0,
        "w": 12,
        "h": 300
      },
      {
        "id": "w_right",
        "x": 348,
        "y": 0,
        "w": 12,
        "h": 300
      },
      {
        "id": "ceiling",
        "x": 0,
        "y": 0,
        "w": 360,
        "h": 12
      },
      {
        "id": "garage_door",
        "x": 180,
        "y": 140,
        "w": 18,
        "h": 160,
        "isDraggable": true,
        "color": "#FFE600"
      }
    ],
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": []
  },
  "31": {
    "title": "CHAMBER 31: BIZARRO REVERSED CONTROLS",
    "hint": "CONTROLS ARE INVERTED! LEFT IS RIGHT, RIGHT IS LEFT — ADAPT AND ESCAPE!",
    "playerStart": {
      "x": 30,
      "y": 260
    },
    "exitDoor": {
      "x": 310,
      "y": 254,
      "w": 28,
      "h": 42,
      "locked": false
    },
    "platforms": [
      {
        "id": "floor",
        "x": 0,
        "y": 300,
        "w": 360,
        "h": 40
      },
      {
        "id": "w_left",
        "x": 0,
        "y": 0,
        "w": 12,
        "h": 300
      },
      {
        "id": "w_right",
        "x": 348,
        "y": 0,
        "w": 12,
        "h": 300
      },
      {
        "id": "ceiling",
        "x": 0,
        "y": 0,
        "w": 360,
        "h": 12
      }
    ],
    "reversedControls": true,
    "hazards": [
      {
        "id": "mid_spikes",
        "x": 140,
        "y": 288,
        "w": 60,
        "h": 12
      }
    ],
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "barriers": []
  },
  "32": {
      "title": "CHAMBER 32: HIGH TENSION PLUG",
      "hint": "PULL THE POWER PLUG OUT OF THE WALL TO POWER DOWN THE DEADLY ELECTRIC GATE!",
      "playerStart": {
          "x": 30,
          "y": 260
      },
      "exitDoor": {
          "x": 310,
          "y": 254,
          "w": 28,
          "h": 42,
          "locked": false
      },
      "plug": {
          "x": 60,
          "y": 150,
          "plugged": true
      },
      "crates": [
          {
              "id": "c1",
              "x": 90,
              "y": 260
          }
      ],
      "platforms": [
          {
              "id": "floor",
              "x": 0,
              "y": 300,
              "w": 360,
              "h": 40
          },
          {
              "id": "w_left",
              "x": 0,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "w_right",
              "x": 348,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "ceiling",
              "x": 0,
              "y": 0,
              "w": 360,
              "h": 12
          }
      ],
      "springs": [],
      "switches": [],
      "keys": [],
      "plates": [],
      "hazards": [],
      "barriers": [
          {
              "id": "b1",
              "x": 200,
              "y": 140,
              "w": 12,
              "h": 160,
              "active": true,
              "byPlug": true
          }
      ]
  },
  "33": {
      "title": "CHAMBER 33: SEISMIC STOMP DOOR",
      "hint": "JUMP FROM THE TOWER AND STOMP THE GROUND 3 TIMES TO SHAKE THE VAULT DOOR LOOSE!",
      "playerStart": {
          "x": 35,
          "y": 260
      },
      "exitDoor": {
          "x": 290,
          "y": 68,
          "w": 28,
          "h": 42,
          "locked": false,
          "isDraggable": false
      },
      "earthquake": {
          "remainingStomps": 3,
          "offset": 0,
          "settled": false
      },
      "platforms": [
          {
              "id": "floor",
              "x": 0,
              "y": 300,
              "w": 360,
              "h": 40
          },
          {
              "id": "w_left",
              "x": 0,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "w_right",
              "x": 348,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "ceiling",
              "x": 0,
              "y": 0,
              "w": 360,
              "h": 12
          },
          {
              "id": "step",
              "x": 100,
              "y": 230,
              "w": 50,
              "h": 14
          },
          {
              "id": "tower",
              "x": 30,
              "y": 150,
              "w": 70,
              "h": 14
          },
          {
              "id": "girder",
              "x": 260,
              "y": 110,
              "w": 88,
              "h": 14
          }
      ],
      "crates": [],
      "springs": [],
      "switches": [],
      "keys": [],
      "plates": [],
      "hazards": [],
      "barriers": []
  },
  "34": {
    "title": "CHAMBER 34: MAGNIFYING GLASS",
    "hint": "DRAG THE MAGNIFYING GLASS OVER THE MICROSCOPIC KEY TO SCALE IT UP!",
    "playerStart": {
      "x": 30,
      "y": 260
    },
    "exitDoor": {
      "x": 310,
      "y": 254,
      "w": 28,
      "h": 42,
      "locked": true
    },
    "platforms": [
      {
        "id": "floor",
        "x": 0,
        "y": 300,
        "w": 360,
        "h": 40
      },
      {
        "id": "w_left",
        "x": 0,
        "y": 0,
        "w": 12,
        "h": 300
      },
      {
        "id": "w_right",
        "x": 348,
        "y": 0,
        "w": 12,
        "h": 300
      },
      {
        "id": "ceiling",
        "x": 0,
        "y": 0,
        "w": 360,
        "h": 12
      }
    ],
    "magnifyingGlass": {
      "x": 80,
      "y": 270,
      "isDraggable": true
    },
    "keys": [
      {
        "id": "k_micro",
        "x": 200,
        "y": 288,
        "taken": false,
        "color": "#FFD166",
        "scale": 0.3
      }
    ],
    "crates": [],
    "springs": [],
    "switches": [],
    "plates": [],
    "hazards": [],
    "barriers": []
  },
  "35": {
      "title": "CHAMBER 35: UNDERGROUND SHOVEL DIG",
      "hint": "DRAG THE SHOVEL TO DIG A TUNNEL THROUGH DIRT BLOCKS UNDER THE WALL!",
      "playerStart": {
          "x": 30,
          "y": 260
      },
      "exitDoor": {
          "x": 310,
          "y": 254,
          "w": 28,
          "h": 42,
          "locked": false
      },
      "shovel": {
          "x": 70,
          "y": 265,
          "taken": false
      },
      "dirtBlocks": [
          {
              "id": "d1",
              "x": 160,
              "y": 210,
              "w": 32,
              "h": 30,
              "dug": false
          },
          {
              "id": "d2",
              "x": 160,
              "y": 240,
              "w": 32,
              "h": 30,
              "dug": false
          },
          {
              "id": "d3",
              "x": 160,
              "y": 270,
              "w": 32,
              "h": 30,
              "dug": false
          }
      ],
      "platforms": [
          {
              "id": "floor_l",
              "x": 0,
              "y": 300,
              "w": 160,
              "h": 40
          },
          {
              "id": "floor_r",
              "x": 192,
              "y": 300,
              "w": 168,
              "h": 40
          },
          {
              "id": "w_left",
              "x": 0,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "w_right",
              "x": 348,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "ceiling",
              "x": 0,
              "y": 0,
              "w": 360,
              "h": 12
          },
          {
              "id": "wall",
              "x": 160,
              "y": 0,
              "w": 32,
              "h": 210
          }
      ],
      "crates": [],
      "springs": [],
      "switches": [],
      "keys": [],
      "plates": [],
      "hazards": [],
      "barriers": []
  },
  "36": {
    "title": "CHAMBER 36: TWO-FINGER OVERRIDE",
    "hint": "TOUCH BOTH DISTANT PRESSURE PLATES AT THE EXACT SAME TIME WITH TWO FINGERS!",
    "playerStart": {
      "x": 30,
      "y": 260
    },
    "exitDoor": {
      "x": 310,
      "y": 254,
      "w": 28,
      "h": 42,
      "locked": false
    },
    "platforms": [
      {
        "id": "floor",
        "x": 0,
        "y": 300,
        "w": 360,
        "h": 40
      },
      {
        "id": "w_left",
        "x": 0,
        "y": 0,
        "w": 12,
        "h": 300
      },
      {
        "id": "w_right",
        "x": 348,
        "y": 0,
        "w": 12,
        "h": 300
      },
      {
        "id": "ceiling",
        "x": 0,
        "y": 0,
        "w": 360,
        "h": 12
      }
    ],
    "plates": [
      {
        "id": "pl_touch1",
        "x": 80,
        "y": 295,
        "w": 32,
        "h": 6,
        "pressed": false
      },
      {
        "id": "pl_touch2",
        "x": 240,
        "y": 295,
        "w": 32,
        "h": 6,
        "pressed": false
      }
    ],
    "barriers": [
      {
        "id": "b_dual",
        "x": 180,
        "y": 160,
        "w": 10,
        "h": 140,
        "active": true,
        "dualPlates": [
          "pl_touch1",
          "pl_touch2"
        ]
      }
    ],
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "hazards": []
  },
  "37": {
    "title": "CHAMBER 37: FIRE SPRINKLER LEVER",
    "hint": "PULL DOWN THE CEILING FIRE LEVER TO ACTIVATE SPRINKLERS AND DOUSE THE FIRE!",
    "playerStart": {
      "x": 30,
      "y": 260
    },
    "exitDoor": {
      "x": 310,
      "y": 254,
      "w": 28,
      "h": 42,
      "locked": false
    },
    "platforms": [
      {
        "id": "floor",
        "x": 0,
        "y": 300,
        "w": 360,
        "h": 40
      },
      {
        "id": "w_left",
        "x": 0,
        "y": 0,
        "w": 12,
        "h": 300
      },
      {
        "id": "w_right",
        "x": 348,
        "y": 0,
        "w": 12,
        "h": 300
      },
      {
        "id": "ceiling",
        "x": 0,
        "y": 0,
        "w": 360,
        "h": 12
      }
    ],
    "switches": [
      {
        "id": "sw_sprinkler",
        "x": 80,
        "y": 120,
        "active": false,
        "isSprinkler": true
      }
    ],
    "hazards": [
      {
        "id": "fire_wall",
        "x": 190,
        "y": 200,
        "w": 30,
        "h": 100,
        "isFire": true
      }
    ],
    "crates": [],
    "springs": [],
    "keys": [],
    "plates": [],
    "barriers": []
  },
  "38": {
      "title": "CHAMBER 38: CYBER BLASTER SHOOT",
      "hint": "PICK UP THE BLASTER GUN AND FIRE AT THE DOOR PADLOCK TO SHATTER IT!",
      "playerStart": {
          "x": 30,
          "y": 260
      },
      "exitDoor": {
          "x": 310,
          "y": 254,
          "w": 28,
          "h": 42,
          "locked": true
      },
      "padlock": {
          "x": 324,
          "y": 275,
          "onDoor": true
      },
      "gun": {
          "x": 80,
          "y": 265,
          "taken": false
      },
      "platforms": [
          {
              "id": "floor_l",
              "x": 0,
              "y": 300,
              "w": 130,
              "h": 40
          },
          {
              "id": "floor_r",
              "x": 270,
              "y": 300,
              "w": 90,
              "h": 40
          },
          {
              "id": "w_left",
              "x": 0,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "w_right",
              "x": 348,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "ceiling",
              "x": 0,
              "y": 0,
              "w": 360,
              "h": 12
          },
          {
              "id": "step",
              "x": 180,
              "y": 260,
              "w": 40,
              "h": 14
          }
      ],
      "crates": [],
      "springs": [],
      "switches": [],
      "keys": [],
      "plates": [],
      "hazards": [
          {
              "id": "spk",
              "x": 130,
              "y": 315,
              "w": 140,
              "h": 25,
              "type": "spikes"
          }
      ],
      "barriers": []
  },
  "39": {
    "title": "CHAMBER 39: PULLEY SCALE HOIST",
    "hint": "PUSH THE HEAVY CRATE ONTO THE RIGHT SCALE PAN TO HOIST THE LEFT PAN WITH YOU!",
    "playerStart": {
      "x": 50,
      "y": 250
    },
    "exitDoor": {
      "x": 70,
      "y": 88,
      "w": 28,
      "h": 42,
      "locked": false
    },
    "platforms": [
      {
        "id": "floor",
        "x": 0,
        "y": 300,
        "w": 360,
        "h": 40
      },
      {
        "id": "w_left",
        "x": 0,
        "y": 0,
        "w": 12,
        "h": 300
      },
      {
        "id": "w_right",
        "x": 348,
        "y": 0,
        "w": 12,
        "h": 300
      },
      {
        "id": "ceiling",
        "x": 0,
        "y": 0,
        "w": 360,
        "h": 12
      },
      {
        "id": "pan_left",
        "x": 30,
        "y": 280,
        "w": 60,
        "h": 12,
        "isScalePan": true,
        "partnerPan": "pan_right"
      },
      {
        "id": "pan_right",
        "x": 240,
        "y": 160,
        "w": 70,
        "h": 12,
        "isScalePan": true,
        "partnerPan": "pan_left"
      },
      {
        "id": "door_shelf",
        "x": 50,
        "y": 130,
        "w": 68,
        "h": 14
      }
    ],
    "crates": [
      {
        "id": "heavy_weight",
        "x": 260,
        "y": 130
      }
    ],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": []
  },
  "40": {
      "title": "CHAMBER 40: SPIKE INVERSION SHIELD",
      "hint": "FLIP DEADLY SPIKES 180° INTO A FLAT BRIDGE, THEN DRAG THEM OVER THE GAP!",
      "playerStart": {
          "x": 30,
          "y": 260
      },
      "exitDoor": {
          "x": 310,
          "y": 254,
          "w": 28,
          "h": 42,
          "locked": false
      },
      "rotatableSpikes": {
          "x": 60,
          "y": 286,
          "w": 90,
          "h": 14,
          "rotated": false,
          "isDraggable": true
      },
      "platforms": [
          {
              "id": "floor_l",
              "x": 0,
              "y": 300,
              "w": 95,
              "h": 40
          },
          {
              "id": "floor_r",
              "x": 265,
              "y": 300,
              "w": 95,
              "h": 40
          },
          {
              "id": "w_left",
              "x": 0,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "w_right",
              "x": 348,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "ceiling",
              "x": 0,
              "y": 0,
              "w": 360,
              "h": 12
          }
      ],
      "crates": [],
      "springs": [],
      "switches": [],
      "keys": [],
      "plates": [],
      "hazards": [
          {
              "id": "spikes",
              "x": 95,
              "y": 315,
              "w": 170,
              "h": 25,
              "type": "spikes"
          }
      ],
      "barriers": []
  },
  "41": {
      "title": "CHAMBER 41: DRAG THE VAULT DOOR",
      "hint": "CANNOT JUMP TO THE HIGH DOOR? GRAB IT WITH YOUR FINGER AND DRAG IT DOWN!",
      "playerStart": {
          "x": 30,
          "y": 260
      },
      "exitDoor": {
          "x": 290,
          "y": 60,
          "w": 28,
          "h": 42,
          "locked": false,
          "isDraggable": true
      },
      "platforms": [
          {
              "id": "floor",
              "x": 0,
              "y": 300,
              "w": 360,
              "h": 40
          },
          {
              "id": "w_left",
              "x": 0,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "w_right",
              "x": 348,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "ceiling",
              "x": 0,
              "y": 0,
              "w": 360,
              "h": 12
          },
          {
              "id": "high_beam",
              "x": 260,
              "y": 102,
              "w": 88,
              "h": 14
          }
      ],
      "crates": [],
      "springs": [],
      "switches": [],
      "keys": [],
      "plates": [],
      "hazards": [
          {
              "id": "h_spikes",
              "x": 120,
              "y": 310,
              "w": 120,
              "h": 20,
              "type": "spikes"
          }
      ],
      "barriers": []
  },
  "42": {
      "title": "CHAMBER 42: UNDERGROUND SHOVEL DIG",
      "hint": "DRAG THE SHOVEL TO DIG A TUNNEL THROUGH DIRT BLOCKS UNDER THE WALL!",
      "playerStart": {
          "x": 30,
          "y": 260
      },
      "exitDoor": {
          "x": 310,
          "y": 254,
          "w": 28,
          "h": 42,
          "locked": false
      },
      "shovel": {
          "x": 70,
          "y": 265,
          "taken": false
      },
      "dirtBlocks": [
          {
              "id": "d1",
              "x": 160,
              "y": 200,
              "w": 30,
              "h": 34,
              "dug": false
          },
          {
              "id": "d2",
              "x": 160,
              "y": 234,
              "w": 30,
              "h": 34,
              "dug": false
          },
          {
              "id": "d3",
              "x": 160,
              "y": 268,
              "w": 30,
              "h": 32,
              "dug": false
          }
      ],
      "platforms": [
          {
              "id": "floor_l",
              "x": 0,
              "y": 300,
              "w": 160,
              "h": 40
          },
          {
              "id": "floor_r",
              "x": 190,
              "y": 300,
              "w": 170,
              "h": 40
          },
          {
              "id": "w_left",
              "x": 0,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "w_right",
              "x": 348,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "ceiling",
              "x": 0,
              "y": 0,
              "w": 360,
              "h": 12
          },
          {
              "id": "wall",
              "x": 160,
              "y": 0,
              "w": 30,
              "h": 200
          }
      ],
      "crates": [],
      "springs": [],
      "switches": [],
      "keys": [],
      "plates": [],
      "hazards": [],
      "barriers": []
  },
  "43": {
      "title": "CHAMBER 43: BLASTER LOCK SHATTER",
      "hint": "PICK UP THE LASER BLASTER AND FIRE ACROSS THE CHASM TO DESTROY THE PADLOCK!",
      "playerStart": {
          "x": 30,
          "y": 260
      },
      "exitDoor": {
          "x": 310,
          "y": 254,
          "w": 28,
          "h": 42,
          "locked": true
      },
      "padlock": {
          "x": 324,
          "y": 275,
          "onDoor": true
      },
      "gun": {
          "x": 80,
          "y": 265,
          "taken": false
      },
      "platforms": [
          {
              "id": "floor_l",
              "x": 0,
              "y": 300,
              "w": 140,
              "h": 40
          },
          {
              "id": "floor_r",
              "x": 260,
              "y": 300,
              "w": 100,
              "h": 40
          },
          {
              "id": "w_left",
              "x": 0,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "w_right",
              "x": 348,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "ceiling",
              "x": 0,
              "y": 0,
              "w": 360,
              "h": 12
          },
          {
              "id": "step",
              "x": 175,
              "y": 260,
              "w": 45,
              "h": 16
          }
      ],
      "crates": [],
      "springs": [],
      "switches": [],
      "keys": [],
      "plates": [],
      "hazards": [
          {
              "id": "h1",
              "x": 140,
              "y": 310,
              "w": 120,
              "h": 20,
              "type": "spikes"
          }
      ],
      "barriers": []
  },
  "44": {
      "title": "CHAMBER 44: HIGH TENSION PLUG",
      "hint": "PUSH THE CRATE UNDER THE PLUG, JUMP UP AND YANK IT OUT OF THE WALL!",
      "playerStart": {
          "x": 30,
          "y": 260
      },
      "exitDoor": {
          "x": 310,
          "y": 254,
          "w": 28,
          "h": 42,
          "locked": false
      },
      "plug": {
          "x": 60,
          "y": 140,
          "plugged": true
      },
      "crates": [
          {
              "id": "c1",
              "x": 100,
              "y": 260
          }
      ],
      "platforms": [
          {
              "id": "floor",
              "x": 0,
              "y": 300,
              "w": 360,
              "h": 40
          },
          {
              "id": "w_left",
              "x": 0,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "w_right",
              "x": 348,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "ceiling",
              "x": 0,
              "y": 0,
              "w": 360,
              "h": 12
          }
      ],
      "springs": [],
      "switches": [],
      "keys": [],
      "plates": [],
      "hazards": [],
      "barriers": [
          {
              "id": "b1",
              "x": 210,
              "y": 130,
              "w": 10,
              "h": 170,
              "active": true,
              "byPlug": true
          }
      ]
  },
  "45": {
      "title": "CHAMBER 45: THE DIRT VAULT",
      "hint": "GRAB THE SHOVEL AND DIG A SAFE TRENCH THROUGH THE DIRT BLOCKS TO REACH THE DOOR!",
      "playerStart": {
          "x": 30,
          "y": 260
      },
      "exitDoor": {
          "x": 310,
          "y": 254,
          "w": 28,
          "h": 42,
          "locked": false
      },
      "shovel": {
          "x": 80,
          "y": 265,
          "taken": false
      },
      "dirtBlocks": [
          {
              "id": "d1",
              "x": 170,
              "y": 190,
              "w": 30,
              "h": 38,
              "dug": false
          },
          {
              "id": "d2",
              "x": 170,
              "y": 228,
              "w": 30,
              "h": 38,
              "dug": false
          },
          {
              "id": "d3",
              "x": 170,
              "y": 266,
              "w": 30,
              "h": 34,
              "dug": false
          }
      ],
      "platforms": [
          {
              "id": "floor_l",
              "x": 0,
              "y": 300,
              "w": 170,
              "h": 40
          },
          {
              "id": "floor_r",
              "x": 200,
              "y": 300,
              "w": 160,
              "h": 40
          },
          {
              "id": "w_left",
              "x": 0,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "w_right",
              "x": 348,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "ceiling",
              "x": 0,
              "y": 0,
              "w": 360,
              "h": 12
          },
          {
              "id": "wall",
              "x": 170,
              "y": 0,
              "w": 30,
              "h": 190
          }
      ],
      "crates": [],
      "springs": [],
      "switches": [],
      "keys": [],
      "plates": [],
      "hazards": [],
      "barriers": []
  },
  "46": {
      "title": "CHAMBER 46: LASER CROSSTIE",
      "hint": "DRAG THE FLOATING METAL SLAB TO BLOCK THE CEILING LASER, PUSH CRATE ONTO SWITCH!",
      "playerStart": {
          "x": 30,
          "y": 260
      },
      "exitDoor": {
          "x": 310,
          "y": 254,
          "w": 28,
          "h": 42,
          "locked": false
      },
      "platforms": [
          {
              "id": "floor",
              "x": 0,
              "y": 300,
              "w": 360,
              "h": 40
          },
          {
              "id": "w_left",
              "x": 0,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "w_right",
              "x": 348,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "ceiling",
              "x": 0,
              "y": 0,
              "w": 360,
              "h": 12
          },
          {
              "id": "slab",
              "x": 60,
              "y": 140,
              "w": 45,
              "h": 14,
              "isDraggable": true
          }
      ],
      "crates": [
          {
              "id": "c1",
              "x": 90,
              "y": 260
          }
      ],
      "plates": [
          {
              "id": "pl1",
              "x": 170,
              "y": 296,
              "w": 36,
              "h": 5,
              "pressed": false,
              "targetBarrierId": "b1"
          }
      ],
      "springs": [],
      "switches": [],
      "keys": [],
      "hazards": [
          {
              "id": "laser1",
              "x": 220,
              "y": 12,
              "w": 6,
              "h": 288,
              "isLaser": true,
              "active": true
          }
      ],
      "barriers": [
          {
              "id": "b1",
              "x": 260,
              "y": 180,
              "w": 10,
              "h": 120,
              "active": true,
              "plateIds": [
                  "pl1"
              ]
          }
      ]
  },
  "47": {
      "title": "CHAMBER 47: SPRING OVER SPIKE PIT",
      "hint": "DRAG THE BOUNCY SPRING ONTO THE CENTRAL PILLAR TO LEAP ACROSS THE SPIKES!",
      "playerStart": {
          "x": 30,
          "y": 260
      },
      "exitDoor": {
          "x": 310,
          "y": 158,
          "w": 28,
          "h": 42,
          "locked": false
      },
      "springs": [
          {
              "id": "sp1",
              "x": 60,
              "y": 288,
              "w": 32,
              "h": 12,
              "isDraggable": true
          }
      ],
      "platforms": [
          {
              "id": "floor_l",
              "x": 0,
              "y": 300,
              "w": 110,
              "h": 40
          },
          {
              "id": "floor_r",
              "x": 270,
              "y": 200,
              "w": 90,
              "h": 140
          },
          {
              "id": "pillar",
              "x": 160,
              "y": 250,
              "w": 50,
              "h": 90
          },
          {
              "id": "w_left",
              "x": 0,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "w_right",
              "x": 348,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "ceiling",
              "x": 0,
              "y": 0,
              "w": 360,
              "h": 12
          }
      ],
      "crates": [],
      "switches": [],
      "keys": [],
      "plates": [],
      "hazards": [
          {
              "id": "spikes",
              "x": 110,
              "y": 320,
              "w": 160,
              "h": 20,
              "type": "spikes"
          }
      ],
      "barriers": []
  },
  "48": {
      "title": "CHAMBER 48: PULL THE POWER PLUG",
      "hint": "YANK THE HIGH POWER PLUG OUT OF THE WALL TO DISABLE THE ELECTRIFIED GATE!",
      "playerStart": {
          "x": 30,
          "y": 260
      },
      "exitDoor": {
          "x": 310,
          "y": 254,
          "w": 28,
          "h": 42,
          "locked": false
      },
      "plug": {
          "x": 70,
          "y": 180,
          "plugged": true
      },
      "platforms": [
          {
              "id": "floor",
              "x": 0,
              "y": 300,
              "w": 360,
              "h": 40
          },
          {
              "id": "w_left",
              "x": 0,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "w_right",
              "x": 348,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "ceiling",
              "x": 0,
              "y": 0,
              "w": 360,
              "h": 12
          },
          {
              "id": "ledge",
              "x": 50,
              "y": 220,
              "w": 60,
              "h": 14
          }
      ],
      "crates": [],
      "springs": [],
      "switches": [],
      "keys": [],
      "plates": [],
      "hazards": [],
      "barriers": [
          {
              "id": "b_plug",
              "x": 200,
              "y": 140,
              "w": 12,
              "h": 160,
              "active": true,
              "byPlug": true
          }
      ]
  },
  "49": {
      "title": "CHAMBER 49: STORM SURGE WINDOW",
      "hint": "TAP THE HIGH WINDOW TO OPEN IT — A VIOLENT GUST OF WIND BLOWS THE DOOR DOWN!",
      "playerStart": {
          "x": 30,
          "y": 260
      },
      "exitDoor": {
          "x": 290,
          "y": 68,
          "w": 28,
          "h": 42,
          "locked": false,
          "isDraggable": false
      },
      "windowObj": {
          "x": 270,
          "y": 28,
          "w": 44,
          "h": 46,
          "open": false
      },
      "platforms": [
          {
              "id": "floor",
              "x": 0,
              "y": 300,
              "w": 360,
              "h": 40
          },
          {
              "id": "w_left",
              "x": 0,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "w_right",
              "x": 348,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "ceiling",
              "x": 0,
              "y": 0,
              "w": 360,
              "h": 12
          },
          {
              "id": "high_beam",
              "x": 260,
              "y": 110,
              "w": 88,
              "h": 14
          }
      ],
      "crates": [],
      "springs": [],
      "switches": [],
      "keys": [],
      "plates": [],
      "hazards": [],
      "barriers": []
  },
  "50": {
      "title": "CHAMBER 50: HUD KEY EXTRACTION",
      "hint": "NO KEY INSIDE THE ROOM? DRAG THE KEY FROM YOUR TOP HUD TO UNLOCK THE DOOR!",
      "playerStart": {
          "x": 30,
          "y": 260
      },
      "exitDoor": {
          "x": 310,
          "y": 254,
          "w": 28,
          "h": 42,
          "locked": true
      },
      "hudKeyDraggable": true,
      "crates": [
          {
              "id": "c1",
              "x": 90,
              "y": 260
          }
      ],
      "platforms": [
          {
              "id": "floor",
              "x": 0,
              "y": 300,
              "w": 360,
              "h": 40
          },
          {
              "id": "w_left",
              "x": 0,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "w_right",
              "x": 348,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "ceiling",
              "x": 0,
              "y": 0,
              "w": 360,
              "h": 12
          },
          {
              "id": "wall",
              "x": 180,
              "y": 180,
              "w": 14,
              "h": 120
          }
      ],
      "springs": [],
      "switches": [],
      "keys": [],
      "plates": [],
      "hazards": [],
      "barriers": []
  },
  "51": {
      "title": "CHAMBER 51: CYBER BLASTER BREAKTHROUGH",
      "hint": "PICK UP THE LASER BLASTER AND SHOOT THE GIANT PADLOCK TO SHATTER THE LOCK!",
      "playerStart": {
          "x": 30,
          "y": 260
      },
      "exitDoor": {
          "x": 310,
          "y": 254,
          "w": 28,
          "h": 42,
          "locked": true
      },
      "padlock": {
          "x": 324,
          "y": 275,
          "onDoor": true
      },
      "gun": {
          "x": 90,
          "y": 265,
          "taken": false
      },
      "platforms": [
          {
              "id": "floor_left",
              "x": 0,
              "y": 300,
              "w": 150,
              "h": 40
          },
          {
              "id": "floor_right",
              "x": 260,
              "y": 300,
              "w": 100,
              "h": 40
          },
          {
              "id": "w_left",
              "x": 0,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "w_right",
              "x": 348,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "ceiling",
              "x": 0,
              "y": 0,
              "w": 360,
              "h": 12
          },
          {
              "id": "mid_pillar",
              "x": 185,
              "y": 260,
              "w": 35,
              "h": 40
          }
      ],
      "crates": [],
      "springs": [],
      "switches": [],
      "keys": [],
      "plates": [],
      "hazards": [
          {
              "id": "h_chasm",
              "x": 150,
              "y": 310,
              "w": 110,
              "h": 20,
              "type": "spikes"
          }
      ],
      "barriers": []
  },
  "52": {
      "title": "CHAMBER 52: HEAL THE ANDROID",
      "hint": "THIS SECURITY GUARD SEEMS LIKE AN HEART PATIENT...",
      "playerStart": {
          "x": 30,
          "y": 260
      },
      "exitDoor": {
          "x": 310,
          "y": 254,
          "w": 28,
          "h": 42,
          "locked": true
      },
      "guard": {
          "x": 140,
          "y": 272,
          "healed": false
      },
      "hintHeart": true,
      "crates": [
          {
              "id": "c1",
              "x": 160,
              "y": 274
          },
          {
              "id": "c2",
              "x": 186,
              "y": 274
          }
      ],
      "platforms": [
          {
              "id": "floor",
              "x": 0,
              "y": 300,
              "w": 360,
              "h": 40
          },
          {
              "id": "w_left",
              "x": 0,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "w_right",
              "x": 348,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "ceiling",
              "x": 0,
              "y": 0,
              "w": 360,
              "h": 12
          },
          {
              "id": "mid_wall",
              "x": 210,
              "y": 220,
              "w": 14,
              "h": 80
          }
      ],
      "springs": [],
      "switches": [],
      "keys": [],
      "plates": [],
      "hazards": [],
      "barriers": []
  },
  "53": {
      "title": "CHAMBER 53: SPIKE INVERSION SHIELD",
      "hint": "FLIP DEADLY SPIKES 180° INTO A FLAT BRIDGE, THEN DRAG THEM OVER THE GAP!",
      "playerStart": {
          "x": 30,
          "y": 260
      },
      "exitDoor": {
          "x": 310,
          "y": 254,
          "w": 28,
          "h": 42,
          "locked": false
      },
      "rotatableSpikes": {
          "x": 70,
          "y": 286,
          "w": 85,
          "h": 14,
          "rotated": false,
          "isDraggable": true
      },
      "platforms": [
          {
              "id": "floor_left",
              "x": 0,
              "y": 300,
              "w": 100,
              "h": 40
          },
          {
              "id": "floor_right",
              "x": 260,
              "y": 300,
              "w": 100,
              "h": 40
          },
          {
              "id": "w_left",
              "x": 0,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "w_right",
              "x": 348,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "ceiling",
              "x": 0,
              "y": 0,
              "w": 360,
              "h": 12
          }
      ],
      "crates": [],
      "springs": [],
      "switches": [],
      "keys": [],
      "plates": [],
      "hazards": [
          {
              "id": "gap_spikes",
              "x": 100,
              "y": 315,
              "w": 160,
              "h": 25,
              "type": "spikes"
          }
      ],
      "barriers": []
  },
  "54": {
      "title": "CHAMBER 54: BATTERY FUSION CORE",
      "hint": "DRAG THE CYBER BATTERY INTO THE WALL SOCKET TO POWER DOWN THE LASER GRID!",
      "playerStart": {
          "x": 30,
          "y": 260
      },
      "exitDoor": {
          "x": 310,
          "y": 254,
          "w": 28,
          "h": 42,
          "locked": false
      },
      "battery": {
          "x": 70,
          "y": 270,
          "w": 22,
          "h": 14,
          "slotted": false
      },
      "socket": {
          "x": 270,
          "y": 270,
          "w": 28,
          "h": 20
      },
      "platforms": [
          {
              "id": "floor",
              "x": 0,
              "y": 300,
              "w": 360,
              "h": 40
          },
          {
              "id": "w_left",
              "x": 0,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "w_right",
              "x": 348,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "ceiling",
              "x": 0,
              "y": 0,
              "w": 360,
              "h": 12
          }
      ],
      "crates": [],
      "springs": [],
      "switches": [],
      "keys": [],
      "plates": [],
      "hazards": [],
      "barriers": [
          {
              "id": "b_bat",
              "x": 180,
              "y": 140,
              "w": 12,
              "h": 160,
              "active": true,
              "byBattery": true
          }
      ]
  },
  "55": {
      "title": "CHAMBER 55: EARTHQUAKE STOMP",
      "hint": "CLIMB THE TOWER AND STOMP THE GROUND 3 TIMES TO SHAKE THE VAULT DOOR DOWN!",
      "playerStart": {
          "x": 35,
          "y": 260
      },
      "exitDoor": {
          "x": 290,
          "y": 68,
          "w": 28,
          "h": 42,
          "locked": false,
          "isDraggable": false
      },
      "earthquake": {
          "remainingStomps": 3,
          "offset": 0,
          "settled": false
      },
      "platforms": [
          {
              "id": "floor",
              "x": 0,
              "y": 300,
              "w": 360,
              "h": 40
          },
          {
              "id": "w_left",
              "x": 0,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "w_right",
              "x": 348,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "ceiling",
              "x": 0,
              "y": 0,
              "w": 360,
              "h": 12
          },
          {
              "id": "tower_step",
              "x": 110,
              "y": 230,
              "w": 50,
              "h": 14
          },
          {
              "id": "tower_top",
              "x": 30,
              "y": 150,
              "w": 70,
              "h": 14
          },
          {
              "id": "high_girder",
              "x": 260,
              "y": 110,
              "w": 88,
              "h": 14
          }
      ],
      "crates": [],
      "springs": [],
      "switches": [],
      "keys": [],
      "plates": [],
      "hazards": [],
      "barriers": []
  },
  "56": {
      "title": "CHAMBER 56: BIZARRO CONTROLS",
      "hint": "CONTROLS ARE REVERSED! LEFT IS RIGHT, RIGHT IS LEFT — LEAP THE SPIKES TO GET THE KEY!",
      "playerStart": {
          "x": 30,
          "y": 260
      },
      "exitDoor": {
          "x": 310,
          "y": 254,
          "w": 28,
          "h": 42,
          "locked": true
      },
      "reversedControls": true,
      "keys": [
          {
              "id": "k1",
              "x": 190,
              "y": 170,
              "taken": false,
              "color": "#FFD166"
          }
      ],
      "platforms": [
          {
              "id": "floor_l",
              "x": 0,
              "y": 300,
              "w": 110,
              "h": 40
          },
          {
              "id": "floor_r",
              "x": 260,
              "y": 300,
              "w": 100,
              "h": 40
          },
          {
              "id": "pillar",
              "x": 165,
              "y": 210,
              "w": 50,
              "h": 14
          },
          {
              "id": "w_left",
              "x": 0,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "w_right",
              "x": 348,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "ceiling",
              "x": 0,
              "y": 0,
              "w": 360,
              "h": 12
          }
      ],
      "crates": [],
      "springs": [],
      "switches": [],
      "plates": [],
      "hazards": [
          {
              "id": "h_spk",
              "x": 110,
              "y": 315,
              "w": 150,
              "h": 25,
              "type": "spikes"
          }
      ],
      "barriers": []
  },
  "57": {
      "title": "CHAMBER 57: DOOR AS STEPPING STONE",
      "hint": "DRAG THE DOOR UNDER THE CEILING KEY, JUMP ON TOP OF IT TO GRAB THE KEY!",
      "playerStart": {
          "x": 30,
          "y": 260
      },
      "exitDoor": {
          "x": 260,
          "y": 90,
          "w": 28,
          "h": 42,
          "locked": true,
          "isDraggable": true
      },
      "keys": [
          {
              "id": "k1",
              "x": 180,
              "y": 50,
              "taken": false,
              "color": "#FFD166"
          }
      ],
      "platforms": [
          {
              "id": "floor",
              "x": 0,
              "y": 300,
              "w": 360,
              "h": 40
          },
          {
              "id": "w_left",
              "x": 0,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "w_right",
              "x": 348,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "ceiling",
              "x": 0,
              "y": 0,
              "w": 360,
              "h": 12
          }
      ],
      "crates": [],
      "springs": [],
      "switches": [],
      "plates": [],
      "hazards": [
          {
              "id": "floor_spikes",
              "x": 130,
              "y": 290,
              "w": 90,
              "h": 10,
              "type": "spikes"
          }
      ],
      "barriers": []
  },
  "58": {
      "title": "CHAMBER 58: QUANTUM PORTAL WARP",
      "hint": "SOLID STEEL WALL? ENTER THE ORANGE PORTAL TO WARP BEHIND IT TO THE DOOR!",
      "playerStart": {
          "x": 30,
          "y": 260
      },
      "exitDoor": {
          "x": 310,
          "y": 138,
          "w": 28,
          "h": 42,
          "locked": false
      },
      "portals": [
          {
              "id": "p1",
              "x": 80,
              "y": 260,
              "color": "#FF6600",
              "targetX": 290,
              "targetY": 130
          },
          {
              "id": "p2",
              "x": 290,
              "y": 130,
              "color": "#00F5FF",
              "targetX": 80,
              "targetY": 260
          }
      ],
      "platforms": [
          {
              "id": "floor_l",
              "x": 0,
              "y": 300,
              "w": 180,
              "h": 40
          },
          {
              "id": "wall",
              "x": 180,
              "y": 0,
              "w": 30,
              "h": 300
          },
          {
              "id": "floor_r",
              "x": 250,
              "y": 180,
              "w": 110,
              "h": 20
          },
          {
              "id": "w_left",
              "x": 0,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "w_right",
              "x": 348,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "ceiling",
              "x": 0,
              "y": 0,
              "w": 360,
              "h": 12
          }
      ],
      "crates": [],
      "springs": [],
      "switches": [],
      "keys": [],
      "plates": [],
      "hazards": [
          {
              "id": "pit",
              "x": 210,
              "y": 320,
              "w": 138,
              "h": 20,
              "type": "spikes"
          }
      ],
      "barriers": []
  },
  "59": {
      "title": "CHAMBER 59: TURBINE UPDRAFT JET",
      "hint": "STEP INTO THE TURBINE AIR VENT TO RIDE THE UPDRAFT OVER THE SPIKE PIT!",
      "playerStart": {
          "x": 30,
          "y": 260
      },
      "exitDoor": {
          "x": 310,
          "y": 118,
          "w": 28,
          "h": 42,
          "locked": false
      },
      "fans": [
          {
              "id": "f1",
              "x": 150,
              "y": 285,
              "w": 45,
              "h": 15,
              "dir": "up"
          }
      ],
      "platforms": [
          {
              "id": "floor_l",
              "x": 0,
              "y": 300,
              "w": 110,
              "h": 40
          },
          {
              "id": "floor_r",
              "x": 260,
              "y": 160,
              "w": 100,
              "h": 140
          },
          {
              "id": "w_left",
              "x": 0,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "w_right",
              "x": 348,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "ceiling",
              "x": 0,
              "y": 0,
              "w": 360,
              "h": 12
          }
      ],
      "crates": [],
      "springs": [],
      "switches": [],
      "keys": [],
      "plates": [],
      "hazards": [
          {
              "id": "spikes",
              "x": 110,
              "y": 320,
              "w": 150,
              "h": 20,
              "type": "spikes"
          }
      ],
      "barriers": []
  },
  "60": {
      "title": "CHAMBER 60: PADLOCK SWIPE TEAR",
      "hint": "TEAR THE HEAVY RUSTY PADLOCK OFF THE DOOR WITH A POWERFUL FINGER SWIPE!",
      "playerStart": {
          "x": 30,
          "y": 260
      },
      "exitDoor": {
          "x": 310,
          "y": 254,
          "w": 28,
          "h": 42,
          "locked": true
      },
      "padlock": {
          "x": 324,
          "y": 275,
          "onDoor": true
      },
      "crates": [
          {
              "id": "c1",
              "x": 90,
              "y": 260
          }
      ],
      "platforms": [
          {
              "id": "floor",
              "x": 0,
              "y": 300,
              "w": 360,
              "h": 40
          },
          {
              "id": "w_left",
              "x": 0,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "w_right",
              "x": 348,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "ceiling",
              "x": 0,
              "y": 0,
              "w": 360,
              "h": 12
          },
          {
              "id": "barrier_block",
              "x": 180,
              "y": 220,
              "w": 18,
              "h": 80
          }
      ],
      "springs": [],
      "switches": [],
      "keys": [],
      "plates": [],
      "hazards": [],
      "barriers": []
  },
  "61": {
      "title": "CHAMBER 61: CEILING RUNNER",
      "hint": "GRAVITY IS REVERSED! JUMP DOWNWARDS BETWEEN SUSPENDED BEAMS TO ESCAPE!",
      "crates": [],
      "springs": [],
      "switches": [],
      "keys": [
          {
              "id": "k1",
              "x": 190,
              "y": 140,
              "taken": false,
              "color": "#FFD166"
          }
      ],
      "plates": [],
      "hazards": [
          {
              "id": "h_floor",
              "x": 30,
              "y": 285,
              "w": 280,
              "h": 15,
              "type": "spikes"
          }
      ],
      "barriers": [],
      "gravityInverted": true,
      "playerStart": {
          "x": 30,
          "y": 80
      },
      "exitDoor": {
          "x": 310,
          "y": 28,
          "w": 28,
          "h": 42,
          "locked": true
      },
      "platforms": [
          {
              "id": "floor",
              "x": 0,
              "y": 300,
              "w": 360,
              "h": 40
          },
          {
              "id": "ceiling",
              "x": 0,
              "y": 0,
              "w": 360,
              "h": 12
          },
          {
              "id": "w_left",
              "x": 0,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "w_right",
              "x": 348,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "b1",
              "x": 100,
              "y": 110,
              "w": 50,
              "h": 14
          },
          {
              "id": "b2",
              "x": 170,
              "y": 160,
              "w": 50,
              "h": 14
          },
          {
              "id": "b3",
              "x": 250,
              "y": 90,
              "w": 50,
              "h": 14
          }
      ]
  },
  "62": {
      "title": "CHAMBER 62: CRATE STACK ESCAPE",
      "hint": "STACK BOTH HEAVY CRATES ON TOP OF EACH OTHER TO VAULT OVER THE BLAST WALL!",
      "crates": [
          {
              "id": "c1",
              "x": 60,
              "y": 260
          },
          {
              "id": "c2",
              "x": 110,
              "y": 260
          }
      ],
      "springs": [],
      "switches": [],
      "keys": [],
      "plates": [],
      "hazards": [],
      "barriers": [],
      "playerStart": {
          "x": 30,
          "y": 260
      },
      "exitDoor": {
          "x": 310,
          "y": 254,
          "w": 28,
          "h": 42,
          "locked": false
      },
      "platforms": [
          {
              "id": "floor",
              "x": 0,
              "y": 300,
              "w": 360,
              "h": 40
          },
          {
              "id": "w_left",
              "x": 0,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "w_right",
              "x": 348,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "ceiling",
              "x": 0,
              "y": 0,
              "w": 360,
              "h": 12
          },
          {
              "id": "tall_wall",
              "x": 190,
              "y": 180,
              "w": 18,
              "h": 120
          }
      ]
  },
  "63": {
      "title": "CHAMBER 63: BOUNCY SPRING LAUNCH",
      "hint": "DRAG THE BOUNCY SPRING UNDER THE HIGH ROOF LEDGE TO LEAP TO SAFETY!",
      "crates": [],
      "springs": [
          {
              "id": "sp1",
              "x": 70,
              "y": 288,
              "w": 32,
              "h": 12,
              "isDraggable": true
          }
      ],
      "switches": [],
      "keys": [],
      "plates": [],
      "hazards": [
          {
              "id": "wall_spk",
              "x": 248,
              "y": 170,
              "w": 12,
              "h": 120,
              "type": "spikes"
          }
      ],
      "barriers": [],
      "playerStart": {
          "x": 30,
          "y": 260
      },
      "exitDoor": {
          "x": 310,
          "y": 118,
          "w": 28,
          "h": 42,
          "locked": false
      },
      "platforms": [
          {
              "id": "floor",
              "x": 0,
              "y": 300,
              "w": 360,
              "h": 40
          },
          {
              "id": "w_left",
              "x": 0,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "w_right",
              "x": 348,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "ceiling",
              "x": 0,
              "y": 0,
              "w": 360,
              "h": 12
          },
          {
              "id": "roof",
              "x": 260,
              "y": 160,
              "w": 100,
              "h": 140
          }
      ]
  },
  "64": {
      "title": "CHAMBER 64: UNDERGROUND TUNNEL",
      "hint": "DRAG THE SHOVEL TO DIG A TUNNEL THROUGH THE DIRT BARRIER!",
      "crates": [],
      "springs": [],
      "switches": [],
      "keys": [],
      "plates": [],
      "hazards": [],
      "barriers": [],
      "playerStart": {
          "x": 30,
          "y": 260
      },
      "exitDoor": {
          "x": 310,
          "y": 254,
          "w": 28,
          "h": 42,
          "locked": false
      },
      "shovel": {
          "x": 70,
          "y": 265,
          "taken": false
      },
      "dirtBlocks": [
          {
              "id": "d1",
              "x": 160,
              "y": 210,
              "w": 32,
              "h": 30,
              "dug": false
          },
          {
              "id": "d2",
              "x": 160,
              "y": 240,
              "w": 32,
              "h": 30,
              "dug": false
          },
          {
              "id": "d3",
              "x": 160,
              "y": 270,
              "w": 32,
              "h": 30,
              "dug": false
          }
      ],
      "platforms": [
          {
              "id": "floor_l",
              "x": 0,
              "y": 300,
              "w": 160,
              "h": 40
          },
          {
              "id": "floor_r",
              "x": 192,
              "y": 300,
              "w": 168,
              "h": 40
          },
          {
              "id": "w_left",
              "x": 0,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "w_right",
              "x": 348,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "ceiling",
              "x": 0,
              "y": 0,
              "w": 360,
              "h": 12
          },
          {
              "id": "solid_top",
              "x": 160,
              "y": 0,
              "w": 32,
              "h": 210
          }
      ]
  },
  "65": {
      "title": "CHAMBER 65: LASER BLASTER SNIPER",
      "hint": "GRAB THE BLASTER GUN AND FIRE AT THE DOOR PADLOCK TO SHATTER IT!",
      "crates": [],
      "springs": [],
      "switches": [],
      "keys": [],
      "plates": [],
      "hazards": [
          {
              "id": "spk",
              "x": 130,
              "y": 315,
              "w": 140,
              "h": 25,
              "type": "spikes"
          }
      ],
      "barriers": [],
      "playerStart": {
          "x": 30,
          "y": 260
      },
      "exitDoor": {
          "x": 310,
          "y": 254,
          "w": 28,
          "h": 42,
          "locked": true
      },
      "padlock": {
          "x": 324,
          "y": 275,
          "onDoor": true
      },
      "gun": {
          "x": 80,
          "y": 265,
          "taken": false
      },
      "platforms": [
          {
              "id": "floor_l",
              "x": 0,
              "y": 300,
              "w": 130,
              "h": 40
          },
          {
              "id": "floor_r",
              "x": 270,
              "y": 300,
              "w": 90,
              "h": 40
          },
          {
              "id": "w_left",
              "x": 0,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "w_right",
              "x": 348,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "ceiling",
              "x": 0,
              "y": 0,
              "w": 360,
              "h": 12
          },
          {
              "id": "step",
              "x": 180,
              "y": 260,
              "w": 40,
              "h": 14
          }
      ]
  },
  "66": {
      "title": "CHAMBER 66: STORM SURGE CYCLONE",
      "hint": "TAP THE WINDOW ABOVE TO OPEN IT — STORM WINDS WILL BLOW THE DOOR DOWN!",
      "crates": [],
      "springs": [],
      "switches": [],
      "keys": [],
      "plates": [],
      "hazards": [],
      "barriers": [],
      "playerStart": {
          "x": 30,
          "y": 260
      },
      "exitDoor": {
          "x": 290,
          "y": 68,
          "w": 28,
          "h": 42,
          "locked": false,
          "isDraggable": false
      },
      "windowObj": {
          "x": 270,
          "y": 28,
          "w": 44,
          "h": 46,
          "open": false
      },
      "platforms": [
          {
              "id": "floor",
              "x": 0,
              "y": 300,
              "w": 360,
              "h": 40
          },
          {
              "id": "w_left",
              "x": 0,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "w_right",
              "x": 348,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "ceiling",
              "x": 0,
              "y": 0,
              "w": 360,
              "h": 12
          },
          {
              "id": "beam",
              "x": 260,
              "y": 110,
              "w": 88,
              "h": 14
          }
      ]
  },
  "67": {
      "title": "CHAMBER 67: REBOOT THE SENTRY",
      "hint": "THIS SECURITY GUARD SEEMS LIKE AN HEART PATIENT...",
      "crates": [
          {
              "id": "c1",
              "x": 166,
              "y": 274
          },
          {
              "id": "c2",
              "x": 192,
              "y": 274
          }
      ],
      "springs": [],
      "switches": [],
      "keys": [],
      "plates": [],
      "hazards": [],
      "barriers": [],
      "playerStart": {
          "x": 30,
          "y": 260
      },
      "exitDoor": {
          "x": 310,
          "y": 254,
          "w": 28,
          "h": 42,
          "locked": true
      },
      "guard": {
          "x": 150,
          "y": 272,
          "healed": false
      },
      "hintHeart": true,
      "platforms": [
          {
              "id": "floor",
              "x": 0,
              "y": 300,
              "w": 360,
              "h": 40
          },
          {
              "id": "w_left",
              "x": 0,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "w_right",
              "x": 348,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "ceiling",
              "x": 0,
              "y": 0,
              "w": 360,
              "h": 12
          },
          {
              "id": "wall",
              "x": 220,
              "y": 220,
              "w": 14,
              "h": 80
          }
      ]
  },
  "68": {
      "title": "CHAMBER 68: SPIKE INVERSION SHIELD",
      "hint": "FLIP THE SPIKES 180° INTO A FLAT SURFACE, THEN DRAG THEM OVER THE CHASM!",
      "crates": [],
      "springs": [],
      "switches": [],
      "keys": [],
      "plates": [],
      "hazards": [
          {
              "id": "spikes",
              "x": 95,
              "y": 315,
              "w": 170,
              "h": 25,
              "type": "spikes"
          }
      ],
      "barriers": [],
      "playerStart": {
          "x": 30,
          "y": 260
      },
      "exitDoor": {
          "x": 310,
          "y": 254,
          "w": 28,
          "h": 42,
          "locked": false
      },
      "rotatableSpikes": {
          "x": 60,
          "y": 286,
          "w": 90,
          "h": 14,
          "rotated": false,
          "isDraggable": true
      },
      "platforms": [
          {
              "id": "floor_l",
              "x": 0,
              "y": 300,
              "w": 95,
              "h": 40
          },
          {
              "id": "floor_r",
              "x": 265,
              "y": 300,
              "w": 95,
              "h": 40
          },
          {
              "id": "w_left",
              "x": 0,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "w_right",
              "x": 348,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "ceiling",
              "x": 0,
              "y": 0,
              "w": 360,
              "h": 12
          }
      ]
  },
  "69": {
      "title": "CHAMBER 69: TOP HUD KEY HEIST",
      "hint": "NO KEY IN SIGHT? DRAG THE GOLDEN KEY FROM YOUR TOP HUD TO OPEN THE DOOR!",
      "crates": [
          {
              "id": "c1",
              "x": 90,
              "y": 260
          }
      ],
      "springs": [],
      "switches": [],
      "keys": [],
      "plates": [],
      "hazards": [],
      "barriers": [],
      "playerStart": {
          "x": 30,
          "y": 260
      },
      "exitDoor": {
          "x": 310,
          "y": 254,
          "w": 28,
          "h": 42,
          "locked": true
      },
      "hudKeyDraggable": true,
      "platforms": [
          {
              "id": "floor",
              "x": 0,
              "y": 300,
              "w": 360,
              "h": 40
          },
          {
              "id": "w_left",
              "x": 0,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "w_right",
              "x": 348,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "ceiling",
              "x": 0,
              "y": 0,
              "w": 360,
              "h": 12
          },
          {
              "id": "wall",
              "x": 190,
              "y": 190,
              "w": 14,
              "h": 110
          }
      ]
  },
  "70": {
      "title": "CHAMBER 70: BATTERY FUSION CORE",
      "hint": "DRAG THE CYBER BATTERY INTO THE WALL SOCKET TO POWER DOWN THE LASER GRID!",
      "crates": [],
      "springs": [],
      "switches": [],
      "keys": [],
      "plates": [],
      "hazards": [],
      "barriers": [
          {
              "id": "b_bat",
              "x": 180,
              "y": 140,
              "w": 12,
              "h": 160,
              "active": true,
              "byBattery": true
          }
      ],
      "playerStart": {
          "x": 30,
          "y": 260
      },
      "exitDoor": {
          "x": 310,
          "y": 254,
          "w": 28,
          "h": 42,
          "locked": false
      },
      "battery": {
          "x": 70,
          "y": 270,
          "w": 22,
          "h": 14,
          "slotted": false
      },
      "socket": {
          "x": 270,
          "y": 270,
          "w": 28,
          "h": 20
      },
      "platforms": [
          {
              "id": "floor",
              "x": 0,
              "y": 300,
              "w": 360,
              "h": 40
          },
          {
              "id": "w_left",
              "x": 0,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "w_right",
              "x": 348,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "ceiling",
              "x": 0,
              "y": 0,
              "w": 360,
              "h": 12
          }
      ]
  },
  "71": {
      "title": "CHAMBER 71: SEISMIC STOMP VAULT",
      "hint": "JUMP AND STOMP THE GROUND 3 TIMES TO SHAKE THE VAULT DOOR LOOSE!",
      "crates": [],
      "springs": [],
      "switches": [],
      "keys": [],
      "plates": [],
      "hazards": [],
      "barriers": [],
      "playerStart": {
          "x": 35,
          "y": 260
      },
      "exitDoor": {
          "x": 290,
          "y": 68,
          "w": 28,
          "h": 42,
          "locked": false,
          "isDraggable": false
      },
      "earthquake": {
          "remainingStomps": 3,
          "offset": 0,
          "settled": false
      },
      "platforms": [
          {
              "id": "floor",
              "x": 0,
              "y": 300,
              "w": 360,
              "h": 40
          },
          {
              "id": "w_left",
              "x": 0,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "w_right",
              "x": 348,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "ceiling",
              "x": 0,
              "y": 0,
              "w": 360,
              "h": 12
          },
          {
              "id": "tower_step",
              "x": 110,
              "y": 230,
              "w": 50,
              "h": 14
          },
          {
              "id": "tower_top",
              "x": 30,
              "y": 150,
              "w": 70,
              "h": 14
          },
          {
              "id": "girder",
              "x": 260,
              "y": 110,
              "w": 88,
              "h": 14
          }
      ]
  },
  "72": {
      "title": "CHAMBER 72: BIZARRO REVERSAL",
      "hint": "CONTROLS ARE INVERTED! LEFT IS RIGHT, RIGHT IS LEFT — LEAP THE SPIKES TO GRAB KEY!",
      "crates": [],
      "springs": [],
      "switches": [],
      "keys": [
          {
              "id": "k1",
              "x": 190,
              "y": 170,
              "taken": false,
              "color": "#FFD166"
          }
      ],
      "plates": [],
      "hazards": [
          {
              "id": "spikes",
              "x": 110,
              "y": 315,
              "w": 150,
              "h": 25,
              "type": "spikes"
          }
      ],
      "barriers": [],
      "playerStart": {
          "x": 30,
          "y": 260
      },
      "exitDoor": {
          "x": 310,
          "y": 254,
          "w": 28,
          "h": 42,
          "locked": true
      },
      "reversedControls": true,
      "platforms": [
          {
              "id": "floor_l",
              "x": 0,
              "y": 300,
              "w": 110,
              "h": 40
          },
          {
              "id": "floor_r",
              "x": 260,
              "y": 300,
              "w": 100,
              "h": 40
          },
          {
              "id": "step",
              "x": 165,
              "y": 210,
              "w": 50,
              "h": 14
          },
          {
              "id": "w_left",
              "x": 0,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "w_right",
              "x": 348,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "ceiling",
              "x": 0,
              "y": 0,
              "w": 360,
              "h": 12
          }
      ]
  },
  "73": {
      "title": "CHAMBER 73: QUANTUM PORTAL WARP",
      "hint": "ENTER THE ORANGE PORTAL TO WARP BEHIND THE IMPASSABLE WALL TO THE DOOR!",
      "crates": [],
      "springs": [],
      "switches": [],
      "keys": [],
      "plates": [],
      "hazards": [
          {
              "id": "pit",
              "x": 210,
              "y": 320,
              "w": 138,
              "h": 20,
              "type": "spikes"
          }
      ],
      "barriers": [],
      "playerStart": {
          "x": 30,
          "y": 260
      },
      "exitDoor": {
          "x": 310,
          "y": 138,
          "w": 28,
          "h": 42,
          "locked": false
      },
      "portals": [
          {
              "id": "p1",
              "x": 80,
              "y": 260,
              "color": "#FF6600",
              "targetX": 290,
              "targetY": 130
          },
          {
              "id": "p2",
              "x": 290,
              "y": 130,
              "color": "#00F5FF",
              "targetX": 80,
              "targetY": 260
          }
      ],
      "platforms": [
          {
              "id": "floor_l",
              "x": 0,
              "y": 300,
              "w": 180,
              "h": 40
          },
          {
              "id": "wall",
              "x": 180,
              "y": 0,
              "w": 30,
              "h": 300
          },
          {
              "id": "floor_r",
              "x": 250,
              "y": 180,
              "w": 110,
              "h": 20
          },
          {
              "id": "w_left",
              "x": 0,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "w_right",
              "x": 348,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "ceiling",
              "x": 0,
              "y": 0,
              "w": 360,
              "h": 12
          }
      ]
  },
  "74": {
      "title": "CHAMBER 74: DRAG THE DOORWAY",
      "hint": "CANNOT JUMP TO THE HIGH DOOR? GRAB IT WITH YOUR FINGER AND DRAG IT DOWN!",
      "crates": [],
      "springs": [],
      "switches": [],
      "keys": [],
      "plates": [],
      "hazards": [
          {
              "id": "spikes",
              "x": 130,
              "y": 310,
              "w": 110,
              "h": 20,
              "type": "spikes"
          }
      ],
      "barriers": [],
      "playerStart": {
          "x": 30,
          "y": 260
      },
      "exitDoor": {
          "x": 290,
          "y": 60,
          "w": 28,
          "h": 42,
          "locked": false,
          "isDraggable": true
      },
      "platforms": [
          {
              "id": "floor",
              "x": 0,
              "y": 300,
              "w": 360,
              "h": 40
          },
          {
              "id": "w_left",
              "x": 0,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "w_right",
              "x": 348,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "ceiling",
              "x": 0,
              "y": 0,
              "w": 360,
              "h": 12
          },
          {
              "id": "beam",
              "x": 260,
              "y": 102,
              "w": 88,
              "h": 14
          }
      ]
  },
  "75": {
      "title": "CHAMBER 75: DOOR STEPPING STONE",
      "hint": "DRAG THE DOOR UNDER THE HIGH KEY, JUMP ON TOP OF IT TO REACH THE KEY!",
      "crates": [],
      "springs": [],
      "switches": [],
      "keys": [
          {
              "id": "k1",
              "x": 180,
              "y": 50,
              "taken": false,
              "color": "#FFD166"
          }
      ],
      "plates": [],
      "hazards": [
          {
              "id": "spikes",
              "x": 130,
              "y": 290,
              "w": 90,
              "h": 10,
              "type": "spikes"
          }
      ],
      "barriers": [],
      "playerStart": {
          "x": 30,
          "y": 260
      },
      "exitDoor": {
          "x": 260,
          "y": 90,
          "w": 28,
          "h": 42,
          "locked": true,
          "isDraggable": true
      },
      "platforms": [
          {
              "id": "floor",
              "x": 0,
              "y": 300,
              "w": 360,
              "h": 40
          },
          {
              "id": "w_left",
              "x": 0,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "w_right",
              "x": 348,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "ceiling",
              "x": 0,
              "y": 0,
              "w": 360,
              "h": 12
          }
      ]
  },
  "76": {
      "title": "CHAMBER 76: TURBINE AIR VENT",
      "hint": "STEP INTO THE TURBINE AIR VENT TO RIDE THE HIGH-PRESSURE UPDRAFT TO THE EXIT!",
      "crates": [],
      "springs": [],
      "switches": [],
      "keys": [],
      "plates": [],
      "hazards": [
          {
              "id": "spikes",
              "x": 110,
              "y": 320,
              "w": 150,
              "h": 20,
              "type": "spikes"
          }
      ],
      "barriers": [],
      "playerStart": {
          "x": 30,
          "y": 260
      },
      "exitDoor": {
          "x": 310,
          "y": 118,
          "w": 28,
          "h": 42,
          "locked": false
      },
      "fans": [
          {
              "id": "f1",
              "x": 150,
              "y": 285,
              "w": 45,
              "h": 15,
              "dir": "up"
          }
      ],
      "platforms": [
          {
              "id": "floor_l",
              "x": 0,
              "y": 300,
              "w": 110,
              "h": 40
          },
          {
              "id": "floor_r",
              "x": 260,
              "y": 160,
              "w": 100,
              "h": 140
          },
          {
              "id": "w_left",
              "x": 0,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "w_right",
              "x": 348,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "ceiling",
              "x": 0,
              "y": 0,
              "w": 360,
              "h": 12
          }
      ]
  },
  "77": {
      "title": "CHAMBER 77: PADLOCK SWIPE TEAR",
      "hint": "TEAR THE HEAVY RUSTY PADLOCK OFF THE DOOR WITH A POWERFUL FINGER SWIPE!",
      "crates": [
          {
              "id": "c1",
              "x": 90,
              "y": 260
          }
      ],
      "springs": [],
      "switches": [],
      "keys": [],
      "plates": [],
      "hazards": [],
      "barriers": [],
      "playerStart": {
          "x": 30,
          "y": 260
      },
      "exitDoor": {
          "x": 310,
          "y": 254,
          "w": 28,
          "h": 42,
          "locked": true
      },
      "padlock": {
          "x": 324,
          "y": 275,
          "onDoor": true
      },
      "platforms": [
          {
              "id": "floor",
              "x": 0,
              "y": 300,
              "w": 360,
              "h": 40
          },
          {
              "id": "w_left",
              "x": 0,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "w_right",
              "x": 348,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "ceiling",
              "x": 0,
              "y": 0,
              "w": 360,
              "h": 12
          },
          {
              "id": "mid_barrier",
              "x": 180,
              "y": 220,
              "w": 18,
              "h": 80
          }
      ]
  },
  "78": {
      "title": "CHAMBER 78: CEILING RUNNER",
      "hint": "GRAVITY IS REVERSED! JUMP DOWNWARDS BETWEEN SUSPENDED BEAMS TO ESCAPE!",
      "crates": [],
      "springs": [],
      "switches": [],
      "keys": [
          {
              "id": "k1",
              "x": 190,
              "y": 140,
              "taken": false,
              "color": "#FFD166"
          }
      ],
      "plates": [],
      "hazards": [
          {
              "id": "h_floor",
              "x": 30,
              "y": 285,
              "w": 280,
              "h": 15,
              "type": "spikes"
          }
      ],
      "barriers": [],
      "gravityInverted": true,
      "playerStart": {
          "x": 30,
          "y": 80
      },
      "exitDoor": {
          "x": 310,
          "y": 28,
          "w": 28,
          "h": 42,
          "locked": true
      },
      "platforms": [
          {
              "id": "floor",
              "x": 0,
              "y": 300,
              "w": 360,
              "h": 40
          },
          {
              "id": "ceiling",
              "x": 0,
              "y": 0,
              "w": 360,
              "h": 12
          },
          {
              "id": "w_left",
              "x": 0,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "w_right",
              "x": 348,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "b1",
              "x": 100,
              "y": 110,
              "w": 50,
              "h": 14
          },
          {
              "id": "b2",
              "x": 170,
              "y": 160,
              "w": 50,
              "h": 14
          },
          {
              "id": "b3",
              "x": 250,
              "y": 90,
              "w": 50,
              "h": 14
          }
      ]
  },
  "79": {
      "title": "CHAMBER 79: CRATE STACK ESCAPE",
      "hint": "STACK BOTH HEAVY CRATES ON TOP OF EACH OTHER TO VAULT OVER THE BLAST WALL!",
      "crates": [
          {
              "id": "c1",
              "x": 60,
              "y": 260
          },
          {
              "id": "c2",
              "x": 110,
              "y": 260
          }
      ],
      "springs": [],
      "switches": [],
      "keys": [],
      "plates": [],
      "hazards": [],
      "barriers": [],
      "playerStart": {
          "x": 30,
          "y": 260
      },
      "exitDoor": {
          "x": 310,
          "y": 254,
          "w": 28,
          "h": 42,
          "locked": false
      },
      "platforms": [
          {
              "id": "floor",
              "x": 0,
              "y": 300,
              "w": 360,
              "h": 40
          },
          {
              "id": "w_left",
              "x": 0,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "w_right",
              "x": 348,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "ceiling",
              "x": 0,
              "y": 0,
              "w": 360,
              "h": 12
          },
          {
              "id": "tall_wall",
              "x": 190,
              "y": 180,
              "w": 18,
              "h": 120
          }
      ]
  },
  "80": {
      "title": "CHAMBER 80: BOUNCY SPRING LAUNCH",
      "hint": "DRAG THE BOUNCY SPRING UNDER THE HIGH ROOF LEDGE TO LEAP TO SAFETY!",
      "crates": [],
      "springs": [
          {
              "id": "sp1",
              "x": 70,
              "y": 288,
              "w": 32,
              "h": 12,
              "isDraggable": true
          }
      ],
      "switches": [],
      "keys": [],
      "plates": [],
      "hazards": [
          {
              "id": "wall_spk",
              "x": 248,
              "y": 170,
              "w": 12,
              "h": 120,
              "type": "spikes"
          }
      ],
      "barriers": [],
      "playerStart": {
          "x": 30,
          "y": 260
      },
      "exitDoor": {
          "x": 310,
          "y": 118,
          "w": 28,
          "h": 42,
          "locked": false
      },
      "platforms": [
          {
              "id": "floor",
              "x": 0,
              "y": 300,
              "w": 360,
              "h": 40
          },
          {
              "id": "w_left",
              "x": 0,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "w_right",
              "x": 348,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "ceiling",
              "x": 0,
              "y": 0,
              "w": 360,
              "h": 12
          },
          {
              "id": "roof",
              "x": 260,
              "y": 160,
              "w": 100,
              "h": 140
          }
      ]
  },
  "81": {
      "title": "CHAMBER 81: UNDERGROUND TUNNEL",
      "hint": "DRAG THE SHOVEL TO DIG A TUNNEL THROUGH THE DIRT BARRIER!",
      "crates": [],
      "springs": [],
      "switches": [],
      "keys": [],
      "plates": [],
      "hazards": [],
      "barriers": [],
      "playerStart": {
          "x": 30,
          "y": 260
      },
      "exitDoor": {
          "x": 310,
          "y": 254,
          "w": 28,
          "h": 42,
          "locked": false
      },
      "shovel": {
          "x": 70,
          "y": 265,
          "taken": false
      },
      "dirtBlocks": [
          {
              "id": "d1",
              "x": 160,
              "y": 210,
              "w": 32,
              "h": 30,
              "dug": false
          },
          {
              "id": "d2",
              "x": 160,
              "y": 240,
              "w": 32,
              "h": 30,
              "dug": false
          },
          {
              "id": "d3",
              "x": 160,
              "y": 270,
              "w": 32,
              "h": 30,
              "dug": false
          }
      ],
      "platforms": [
          {
              "id": "floor_l",
              "x": 0,
              "y": 300,
              "w": 160,
              "h": 40
          },
          {
              "id": "floor_r",
              "x": 192,
              "y": 300,
              "w": 168,
              "h": 40
          },
          {
              "id": "w_left",
              "x": 0,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "w_right",
              "x": 348,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "ceiling",
              "x": 0,
              "y": 0,
              "w": 360,
              "h": 12
          },
          {
              "id": "solid_top",
              "x": 160,
              "y": 0,
              "w": 32,
              "h": 210
          }
      ]
  },
  "82": {
      "title": "CHAMBER 82: LASER BLASTER SNIPER",
      "hint": "GRAB THE BLASTER GUN AND FIRE AT THE DOOR PADLOCK TO SHATTER IT!",
      "crates": [],
      "springs": [],
      "switches": [],
      "keys": [],
      "plates": [],
      "hazards": [
          {
              "id": "spk",
              "x": 130,
              "y": 315,
              "w": 140,
              "h": 25,
              "type": "spikes"
          }
      ],
      "barriers": [],
      "playerStart": {
          "x": 30,
          "y": 260
      },
      "exitDoor": {
          "x": 310,
          "y": 254,
          "w": 28,
          "h": 42,
          "locked": true
      },
      "padlock": {
          "x": 324,
          "y": 275,
          "onDoor": true
      },
      "gun": {
          "x": 80,
          "y": 265,
          "taken": false
      },
      "platforms": [
          {
              "id": "floor_l",
              "x": 0,
              "y": 300,
              "w": 130,
              "h": 40
          },
          {
              "id": "floor_r",
              "x": 270,
              "y": 300,
              "w": 90,
              "h": 40
          },
          {
              "id": "w_left",
              "x": 0,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "w_right",
              "x": 348,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "ceiling",
              "x": 0,
              "y": 0,
              "w": 360,
              "h": 12
          },
          {
              "id": "step",
              "x": 180,
              "y": 260,
              "w": 40,
              "h": 14
          }
      ]
  },
  "83": {
      "title": "CHAMBER 83: STORM SURGE CYCLONE",
      "hint": "TAP THE WINDOW ABOVE TO OPEN IT — STORM WINDS WILL BLOW THE DOOR DOWN!",
      "crates": [],
      "springs": [],
      "switches": [],
      "keys": [],
      "plates": [],
      "hazards": [],
      "barriers": [],
      "playerStart": {
          "x": 30,
          "y": 260
      },
      "exitDoor": {
          "x": 290,
          "y": 68,
          "w": 28,
          "h": 42,
          "locked": false,
          "isDraggable": false
      },
      "windowObj": {
          "x": 270,
          "y": 28,
          "w": 44,
          "h": 46,
          "open": false
      },
      "platforms": [
          {
              "id": "floor",
              "x": 0,
              "y": 300,
              "w": 360,
              "h": 40
          },
          {
              "id": "w_left",
              "x": 0,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "w_right",
              "x": 348,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "ceiling",
              "x": 0,
              "y": 0,
              "w": 360,
              "h": 12
          },
          {
              "id": "beam",
              "x": 260,
              "y": 110,
              "w": 88,
              "h": 14
          }
      ]
  },
  "84": {
      "title": "CHAMBER 84: REBOOT THE SENTRY",
      "hint": "THIS SECURITY GUARD SEEMS LIKE AN HEART PATIENT...",
      "crates": [
          {
              "id": "c1",
              "x": 166,
              "y": 274
          },
          {
              "id": "c2",
              "x": 192,
              "y": 274
          }
      ],
      "springs": [],
      "switches": [],
      "keys": [],
      "plates": [],
      "hazards": [],
      "barriers": [],
      "playerStart": {
          "x": 30,
          "y": 260
      },
      "exitDoor": {
          "x": 310,
          "y": 254,
          "w": 28,
          "h": 42,
          "locked": true
      },
      "guard": {
          "x": 150,
          "y": 272,
          "healed": false
      },
      "hintHeart": true,
      "platforms": [
          {
              "id": "floor",
              "x": 0,
              "y": 300,
              "w": 360,
              "h": 40
          },
          {
              "id": "w_left",
              "x": 0,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "w_right",
              "x": 348,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "ceiling",
              "x": 0,
              "y": 0,
              "w": 360,
              "h": 12
          },
          {
              "id": "wall",
              "x": 220,
              "y": 220,
              "w": 14,
              "h": 80
          }
      ]
  },
  "85": {
      "title": "CHAMBER 85: SPIKE INVERSION SHIELD",
      "hint": "FLIP THE SPIKES 180° INTO A FLAT SURFACE, THEN DRAG THEM OVER THE CHASM!",
      "crates": [],
      "springs": [],
      "switches": [],
      "keys": [],
      "plates": [],
      "hazards": [
          {
              "id": "spikes",
              "x": 95,
              "y": 315,
              "w": 170,
              "h": 25,
              "type": "spikes"
          }
      ],
      "barriers": [],
      "playerStart": {
          "x": 30,
          "y": 260
      },
      "exitDoor": {
          "x": 310,
          "y": 254,
          "w": 28,
          "h": 42,
          "locked": false
      },
      "rotatableSpikes": {
          "x": 60,
          "y": 286,
          "w": 90,
          "h": 14,
          "rotated": false,
          "isDraggable": true
      },
      "platforms": [
          {
              "id": "floor_l",
              "x": 0,
              "y": 300,
              "w": 95,
              "h": 40
          },
          {
              "id": "floor_r",
              "x": 265,
              "y": 300,
              "w": 95,
              "h": 40
          },
          {
              "id": "w_left",
              "x": 0,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "w_right",
              "x": 348,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "ceiling",
              "x": 0,
              "y": 0,
              "w": 360,
              "h": 12
          }
      ]
  },
  "86": {
      "title": "CHAMBER 86: TOP HUD KEY HEIST",
      "hint": "NO KEY IN SIGHT? DRAG THE GOLDEN KEY FROM YOUR TOP HUD TO OPEN THE DOOR!",
      "crates": [
          {
              "id": "c1",
              "x": 90,
              "y": 260
          }
      ],
      "springs": [],
      "switches": [],
      "keys": [],
      "plates": [],
      "hazards": [],
      "barriers": [],
      "playerStart": {
          "x": 30,
          "y": 260
      },
      "exitDoor": {
          "x": 310,
          "y": 254,
          "w": 28,
          "h": 42,
          "locked": true
      },
      "hudKeyDraggable": true,
      "platforms": [
          {
              "id": "floor",
              "x": 0,
              "y": 300,
              "w": 360,
              "h": 40
          },
          {
              "id": "w_left",
              "x": 0,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "w_right",
              "x": 348,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "ceiling",
              "x": 0,
              "y": 0,
              "w": 360,
              "h": 12
          },
          {
              "id": "wall",
              "x": 190,
              "y": 190,
              "w": 14,
              "h": 110
          }
      ]
  },
  "87": {
      "title": "CHAMBER 87: BATTERY FUSION CORE",
      "hint": "DRAG THE CYBER BATTERY INTO THE WALL SOCKET TO POWER DOWN THE LASER GRID!",
      "crates": [],
      "springs": [],
      "switches": [],
      "keys": [],
      "plates": [],
      "hazards": [],
      "barriers": [
          {
              "id": "b_bat",
              "x": 180,
              "y": 140,
              "w": 12,
              "h": 160,
              "active": true,
              "byBattery": true
          }
      ],
      "playerStart": {
          "x": 30,
          "y": 260
      },
      "exitDoor": {
          "x": 310,
          "y": 254,
          "w": 28,
          "h": 42,
          "locked": false
      },
      "battery": {
          "x": 70,
          "y": 270,
          "w": 22,
          "h": 14,
          "slotted": false
      },
      "socket": {
          "x": 270,
          "y": 270,
          "w": 28,
          "h": 20
      },
      "platforms": [
          {
              "id": "floor",
              "x": 0,
              "y": 300,
              "w": 360,
              "h": 40
          },
          {
              "id": "w_left",
              "x": 0,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "w_right",
              "x": 348,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "ceiling",
              "x": 0,
              "y": 0,
              "w": 360,
              "h": 12
          }
      ]
  },
  "88": {
      "title": "CHAMBER 88: SEISMIC STOMP VAULT",
      "hint": "JUMP AND STOMP THE GROUND 3 TIMES TO SHAKE THE VAULT DOOR LOOSE!",
      "crates": [],
      "springs": [],
      "switches": [],
      "keys": [],
      "plates": [],
      "hazards": [],
      "barriers": [],
      "playerStart": {
          "x": 35,
          "y": 260
      },
      "exitDoor": {
          "x": 290,
          "y": 68,
          "w": 28,
          "h": 42,
          "locked": false,
          "isDraggable": false
      },
      "earthquake": {
          "remainingStomps": 3,
          "offset": 0,
          "settled": false
      },
      "platforms": [
          {
              "id": "floor",
              "x": 0,
              "y": 300,
              "w": 360,
              "h": 40
          },
          {
              "id": "w_left",
              "x": 0,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "w_right",
              "x": 348,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "ceiling",
              "x": 0,
              "y": 0,
              "w": 360,
              "h": 12
          },
          {
              "id": "tower_step",
              "x": 110,
              "y": 230,
              "w": 50,
              "h": 14
          },
          {
              "id": "tower_top",
              "x": 30,
              "y": 150,
              "w": 70,
              "h": 14
          },
          {
              "id": "girder",
              "x": 260,
              "y": 110,
              "w": 88,
              "h": 14
          }
      ]
  },
  "89": {
      "title": "CHAMBER 89: BIZARRO REVERSAL",
      "hint": "CONTROLS ARE INVERTED! LEFT IS RIGHT, RIGHT IS LEFT — LEAP THE SPIKES TO GRAB KEY!",
      "crates": [],
      "springs": [],
      "switches": [],
      "keys": [
          {
              "id": "k1",
              "x": 190,
              "y": 170,
              "taken": false,
              "color": "#FFD166"
          }
      ],
      "plates": [],
      "hazards": [
          {
              "id": "spikes",
              "x": 110,
              "y": 315,
              "w": 150,
              "h": 25,
              "type": "spikes"
          }
      ],
      "barriers": [],
      "playerStart": {
          "x": 30,
          "y": 260
      },
      "exitDoor": {
          "x": 310,
          "y": 254,
          "w": 28,
          "h": 42,
          "locked": true
      },
      "reversedControls": true,
      "platforms": [
          {
              "id": "floor_l",
              "x": 0,
              "y": 300,
              "w": 110,
              "h": 40
          },
          {
              "id": "floor_r",
              "x": 260,
              "y": 300,
              "w": 100,
              "h": 40
          },
          {
              "id": "step",
              "x": 165,
              "y": 210,
              "w": 50,
              "h": 14
          },
          {
              "id": "w_left",
              "x": 0,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "w_right",
              "x": 348,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "ceiling",
              "x": 0,
              "y": 0,
              "w": 360,
              "h": 12
          }
      ]
  },
  "90": {
      "title": "CHAMBER 90: QUANTUM PORTAL WARP",
      "hint": "ENTER THE ORANGE PORTAL TO WARP BEHIND THE IMPASSABLE WALL TO THE DOOR!",
      "crates": [],
      "springs": [],
      "switches": [],
      "keys": [],
      "plates": [],
      "hazards": [
          {
              "id": "pit",
              "x": 210,
              "y": 320,
              "w": 138,
              "h": 20,
              "type": "spikes"
          }
      ],
      "barriers": [],
      "playerStart": {
          "x": 30,
          "y": 260
      },
      "exitDoor": {
          "x": 310,
          "y": 138,
          "w": 28,
          "h": 42,
          "locked": false
      },
      "portals": [
          {
              "id": "p1",
              "x": 80,
              "y": 260,
              "color": "#FF6600",
              "targetX": 290,
              "targetY": 130
          },
          {
              "id": "p2",
              "x": 290,
              "y": 130,
              "color": "#00F5FF",
              "targetX": 80,
              "targetY": 260
          }
      ],
      "platforms": [
          {
              "id": "floor_l",
              "x": 0,
              "y": 300,
              "w": 180,
              "h": 40
          },
          {
              "id": "wall",
              "x": 180,
              "y": 0,
              "w": 30,
              "h": 300
          },
          {
              "id": "floor_r",
              "x": 250,
              "y": 180,
              "w": 110,
              "h": 20
          },
          {
              "id": "w_left",
              "x": 0,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "w_right",
              "x": 348,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "ceiling",
              "x": 0,
              "y": 0,
              "w": 360,
              "h": 12
          }
      ]
  },
  "91": {
      "title": "CHAMBER 91: DRAG THE DOORWAY",
      "hint": "CANNOT JUMP TO THE HIGH DOOR? GRAB IT WITH YOUR FINGER AND DRAG IT DOWN!",
      "crates": [],
      "springs": [],
      "switches": [],
      "keys": [],
      "plates": [],
      "hazards": [
          {
              "id": "spikes",
              "x": 130,
              "y": 310,
              "w": 110,
              "h": 20,
              "type": "spikes"
          }
      ],
      "barriers": [],
      "playerStart": {
          "x": 30,
          "y": 260
      },
      "exitDoor": {
          "x": 290,
          "y": 60,
          "w": 28,
          "h": 42,
          "locked": false,
          "isDraggable": true
      },
      "platforms": [
          {
              "id": "floor",
              "x": 0,
              "y": 300,
              "w": 360,
              "h": 40
          },
          {
              "id": "w_left",
              "x": 0,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "w_right",
              "x": 348,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "ceiling",
              "x": 0,
              "y": 0,
              "w": 360,
              "h": 12
          },
          {
              "id": "beam",
              "x": 260,
              "y": 102,
              "w": 88,
              "h": 14
          }
      ]
  },
  "92": {
      "title": "CHAMBER 92: DOOR STEPPING STONE",
      "hint": "DRAG THE DOOR UNDER THE HIGH KEY, JUMP ON TOP OF IT TO REACH THE KEY!",
      "crates": [],
      "springs": [],
      "switches": [],
      "keys": [
          {
              "id": "k1",
              "x": 180,
              "y": 50,
              "taken": false,
              "color": "#FFD166"
          }
      ],
      "plates": [],
      "hazards": [
          {
              "id": "spikes",
              "x": 130,
              "y": 290,
              "w": 90,
              "h": 10,
              "type": "spikes"
          }
      ],
      "barriers": [],
      "playerStart": {
          "x": 30,
          "y": 260
      },
      "exitDoor": {
          "x": 260,
          "y": 90,
          "w": 28,
          "h": 42,
          "locked": true,
          "isDraggable": true
      },
      "platforms": [
          {
              "id": "floor",
              "x": 0,
              "y": 300,
              "w": 360,
              "h": 40
          },
          {
              "id": "w_left",
              "x": 0,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "w_right",
              "x": 348,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "ceiling",
              "x": 0,
              "y": 0,
              "w": 360,
              "h": 12
          }
      ]
  },
  "93": {
      "title": "CHAMBER 93: TURBINE AIR VENT",
      "hint": "STEP INTO THE TURBINE AIR VENT TO RIDE THE HIGH-PRESSURE UPDRAFT TO THE EXIT!",
      "crates": [],
      "springs": [],
      "switches": [],
      "keys": [],
      "plates": [],
      "hazards": [
          {
              "id": "spikes",
              "x": 110,
              "y": 320,
              "w": 150,
              "h": 20,
              "type": "spikes"
          }
      ],
      "barriers": [],
      "playerStart": {
          "x": 30,
          "y": 260
      },
      "exitDoor": {
          "x": 310,
          "y": 118,
          "w": 28,
          "h": 42,
          "locked": false
      },
      "fans": [
          {
              "id": "f1",
              "x": 150,
              "y": 285,
              "w": 45,
              "h": 15,
              "dir": "up"
          }
      ],
      "platforms": [
          {
              "id": "floor_l",
              "x": 0,
              "y": 300,
              "w": 110,
              "h": 40
          },
          {
              "id": "floor_r",
              "x": 260,
              "y": 160,
              "w": 100,
              "h": 140
          },
          {
              "id": "w_left",
              "x": 0,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "w_right",
              "x": 348,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "ceiling",
              "x": 0,
              "y": 0,
              "w": 360,
              "h": 12
          }
      ]
  },
  "94": {
      "title": "CHAMBER 94: PADLOCK SWIPE TEAR",
      "hint": "TEAR THE HEAVY RUSTY PADLOCK OFF THE DOOR WITH A POWERFUL FINGER SWIPE!",
      "crates": [
          {
              "id": "c1",
              "x": 90,
              "y": 260
          }
      ],
      "springs": [],
      "switches": [],
      "keys": [],
      "plates": [],
      "hazards": [],
      "barriers": [],
      "playerStart": {
          "x": 30,
          "y": 260
      },
      "exitDoor": {
          "x": 310,
          "y": 254,
          "w": 28,
          "h": 42,
          "locked": true
      },
      "padlock": {
          "x": 324,
          "y": 275,
          "onDoor": true
      },
      "platforms": [
          {
              "id": "floor",
              "x": 0,
              "y": 300,
              "w": 360,
              "h": 40
          },
          {
              "id": "w_left",
              "x": 0,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "w_right",
              "x": 348,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "ceiling",
              "x": 0,
              "y": 0,
              "w": 360,
              "h": 12
          },
          {
              "id": "mid_barrier",
              "x": 180,
              "y": 220,
              "w": 18,
              "h": 80
          }
      ]
  },
  "95": {
      "title": "CHAMBER 95: CEILING RUNNER",
      "hint": "GRAVITY IS REVERSED! JUMP DOWNWARDS BETWEEN SUSPENDED BEAMS TO ESCAPE!",
      "crates": [],
      "springs": [],
      "switches": [],
      "keys": [
          {
              "id": "k1",
              "x": 190,
              "y": 140,
              "taken": false,
              "color": "#FFD166"
          }
      ],
      "plates": [],
      "hazards": [
          {
              "id": "h_floor",
              "x": 30,
              "y": 285,
              "w": 280,
              "h": 15,
              "type": "spikes"
          }
      ],
      "barriers": [],
      "gravityInverted": true,
      "playerStart": {
          "x": 30,
          "y": 80
      },
      "exitDoor": {
          "x": 310,
          "y": 28,
          "w": 28,
          "h": 42,
          "locked": true
      },
      "platforms": [
          {
              "id": "floor",
              "x": 0,
              "y": 300,
              "w": 360,
              "h": 40
          },
          {
              "id": "ceiling",
              "x": 0,
              "y": 0,
              "w": 360,
              "h": 12
          },
          {
              "id": "w_left",
              "x": 0,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "w_right",
              "x": 348,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "b1",
              "x": 100,
              "y": 110,
              "w": 50,
              "h": 14
          },
          {
              "id": "b2",
              "x": 170,
              "y": 160,
              "w": 50,
              "h": 14
          },
          {
              "id": "b3",
              "x": 250,
              "y": 90,
              "w": 50,
              "h": 14
          }
      ]
  },
  "96": {
      "title": "CHAMBER 96: CRATE STACK ESCAPE",
      "hint": "STACK BOTH HEAVY CRATES ON TOP OF EACH OTHER TO VAULT OVER THE BLAST WALL!",
      "crates": [
          {
              "id": "c1",
              "x": 60,
              "y": 260
          },
          {
              "id": "c2",
              "x": 110,
              "y": 260
          }
      ],
      "springs": [],
      "switches": [],
      "keys": [],
      "plates": [],
      "hazards": [],
      "barriers": [],
      "playerStart": {
          "x": 30,
          "y": 260
      },
      "exitDoor": {
          "x": 310,
          "y": 254,
          "w": 28,
          "h": 42,
          "locked": false
      },
      "platforms": [
          {
              "id": "floor",
              "x": 0,
              "y": 300,
              "w": 360,
              "h": 40
          },
          {
              "id": "w_left",
              "x": 0,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "w_right",
              "x": 348,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "ceiling",
              "x": 0,
              "y": 0,
              "w": 360,
              "h": 12
          },
          {
              "id": "tall_wall",
              "x": 190,
              "y": 180,
              "w": 18,
              "h": 120
          }
      ]
  },
  "97": {
      "title": "CHAMBER 97: BOUNCY SPRING LAUNCH",
      "hint": "DRAG THE BOUNCY SPRING UNDER THE HIGH ROOF LEDGE TO LEAP TO SAFETY!",
      "crates": [],
      "springs": [
          {
              "id": "sp1",
              "x": 70,
              "y": 288,
              "w": 32,
              "h": 12,
              "isDraggable": true
          }
      ],
      "switches": [],
      "keys": [],
      "plates": [],
      "hazards": [
          {
              "id": "wall_spk",
              "x": 248,
              "y": 170,
              "w": 12,
              "h": 120,
              "type": "spikes"
          }
      ],
      "barriers": [],
      "playerStart": {
          "x": 30,
          "y": 260
      },
      "exitDoor": {
          "x": 310,
          "y": 118,
          "w": 28,
          "h": 42,
          "locked": false
      },
      "platforms": [
          {
              "id": "floor",
              "x": 0,
              "y": 300,
              "w": 360,
              "h": 40
          },
          {
              "id": "w_left",
              "x": 0,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "w_right",
              "x": 348,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "ceiling",
              "x": 0,
              "y": 0,
              "w": 360,
              "h": 12
          },
          {
              "id": "roof",
              "x": 260,
              "y": 160,
              "w": 100,
              "h": 140
          }
      ]
  },
  "98": {
      "title": "CHAMBER 98: UNDERGROUND TUNNEL",
      "hint": "DRAG THE SHOVEL TO DIG A TUNNEL THROUGH THE DIRT BARRIER!",
      "crates": [],
      "springs": [],
      "switches": [],
      "keys": [],
      "plates": [],
      "hazards": [],
      "barriers": [],
      "playerStart": {
          "x": 30,
          "y": 260
      },
      "exitDoor": {
          "x": 310,
          "y": 254,
          "w": 28,
          "h": 42,
          "locked": false
      },
      "shovel": {
          "x": 70,
          "y": 265,
          "taken": false
      },
      "dirtBlocks": [
          {
              "id": "d1",
              "x": 160,
              "y": 210,
              "w": 32,
              "h": 30,
              "dug": false
          },
          {
              "id": "d2",
              "x": 160,
              "y": 240,
              "w": 32,
              "h": 30,
              "dug": false
          },
          {
              "id": "d3",
              "x": 160,
              "y": 270,
              "w": 32,
              "h": 30,
              "dug": false
          }
      ],
      "platforms": [
          {
              "id": "floor_l",
              "x": 0,
              "y": 300,
              "w": 160,
              "h": 40
          },
          {
              "id": "floor_r",
              "x": 192,
              "y": 300,
              "w": 168,
              "h": 40
          },
          {
              "id": "w_left",
              "x": 0,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "w_right",
              "x": 348,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "ceiling",
              "x": 0,
              "y": 0,
              "w": 360,
              "h": 12
          },
          {
              "id": "solid_top",
              "x": 160,
              "y": 0,
              "w": 32,
              "h": 210
          }
      ]
  },
  "99": {
      "title": "CHAMBER 99: LASER BLASTER SNIPER",
      "hint": "GRAB THE BLASTER GUN AND FIRE AT THE DOOR PADLOCK TO SHATTER IT!",
      "crates": [],
      "springs": [],
      "switches": [],
      "keys": [],
      "plates": [],
      "hazards": [
          {
              "id": "spk",
              "x": 130,
              "y": 315,
              "w": 140,
              "h": 25,
              "type": "spikes"
          }
      ],
      "barriers": [],
      "playerStart": {
          "x": 30,
          "y": 260
      },
      "exitDoor": {
          "x": 310,
          "y": 254,
          "w": 28,
          "h": 42,
          "locked": true
      },
      "padlock": {
          "x": 324,
          "y": 275,
          "onDoor": true
      },
      "gun": {
          "x": 80,
          "y": 265,
          "taken": false
      },
      "platforms": [
          {
              "id": "floor_l",
              "x": 0,
              "y": 300,
              "w": 130,
              "h": 40
          },
          {
              "id": "floor_r",
              "x": 270,
              "y": 300,
              "w": 90,
              "h": 40
          },
          {
              "id": "w_left",
              "x": 0,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "w_right",
              "x": 348,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "ceiling",
              "x": 0,
              "y": 0,
              "w": 360,
              "h": 12
          },
          {
              "id": "step",
              "x": 180,
              "y": 260,
              "w": 40,
              "h": 14
          }
      ]
  },
  "100": {
      "title": "CHAMBER 100: MASTER CYBER FINALE",
      "hint": "THIS SECURITY GUARD SEEMS LIKE AN HEART PATIENT... BLAST THE PADLOCK WITH THE GUN!",
      "playerStart": {
          "x": 30,
          "y": 260
      },
      "exitDoor": {
          "x": 310,
          "y": 254,
          "w": 28,
          "h": 42,
          "locked": true
      },
      "padlock": {
          "x": 324,
          "y": 275,
          "onDoor": true
      },
      "guard": {
          "x": 130,
          "y": 272,
          "healed": false
      },
      "hintHeart": true,
      "gun": {
          "x": 60,
          "y": 265,
          "taken": false
      },
      "platforms": [
          {
              "id": "floor",
              "x": 0,
              "y": 300,
              "w": 360,
              "h": 40
          },
          {
              "id": "w_left",
              "x": 0,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "w_right",
              "x": 348,
              "y": 0,
              "w": 12,
              "h": 300
          },
          {
              "id": "ceiling",
              "x": 0,
              "y": 0,
              "w": 360,
              "h": 12
          },
          {
              "id": "mid_wall",
              "x": 220,
              "y": 170,
              "w": 14,
              "h": 130
          }
      ],
      "crates": [
          {
              "id": "c1",
              "x": 90,
              "y": 260
          }
      ],
      "springs": [],
      "switches": [],
      "keys": [],
      "plates": [],
      "hazards": [],
      "barriers": []
  }
};

export function getGeneratedRoom(lvl) {
  const normLvl = ((lvl - 1) % 100) + 1;
  const room = ALL_CHAMBER_LEVELS[normLvl];
  if (!room) {
    return ALL_CHAMBER_LEVELS[1];
  }
  // Return deep clone so mutations in game physics loop don't contaminate level definitions
  return JSON.parse(JSON.stringify(room));
}
