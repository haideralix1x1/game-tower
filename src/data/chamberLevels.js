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
    "hint": "GIVE THE ❤️ FROM THIS HINT TO HEAL THE DYING GUARD!",
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
    "title": "CHAMBER 32: CORD IN THE DARK",
    "hint": "THE ROOM IS PITCH BLACK! PULL DOWN THE HANGING CORD TO TURN ON THE LIGHTS!",
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
    "darkRoom": true,
    "lightCord": {
      "x": 180,
      "y": 80,
      "pulled": false
    },
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": []
  },
  "33": {
    "title": "CHAMBER 33: SLEEPING SENTRY",
    "hint": "TAP THE AUDIO BUTTON TO MUTE YOUR FOOTSTEPS BEFORE WALKING PAST THE BEAST!",
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
    "sleepingMonster": {
      "x": 170,
      "y": 250,
      "w": 45,
      "h": 50,
      "asleep": true
    },
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
    "title": "CHAMBER 35: PAINT THE DOOR GREEN",
    "hint": "DIP THE BRUSH IN NEON GREEN PAINT AND COAT THE GRAY FAKE DOOR!",
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
      "isUnpainted": true
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
    "paintCan": {
      "x": 90,
      "y": 274,
      "color": "#00F5D4"
    },
    "paintBrush": {
      "x": 130,
      "y": 270,
      "isDraggable": true,
      "dipped": false
    },
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
    "title": "CHAMBER 38: PENCIL ERASER TOOL",
    "hint": "RUB THE ERASER TOOL OVER THE DRAWN BRICK WALL TO WIPE IT OUT COMPLETELY!",
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
        "id": "drawn_wall",
        "x": 180,
        "y": 160,
        "w": 20,
        "h": 140,
        "isErasable": true
      }
    ],
    "eraser": {
      "x": 80,
      "y": 270,
      "isDraggable": true
    },
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
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
    "title": "CHAMBER 40: PAUSE MENU SECRET",
    "hint": "THE DOOR IS LOCKED WITH A 4-DIGIT CODE! CHECK INSIDE THE PAUSE MENU FOR IT!",
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
      "keypadCode": "4096"
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
    "keypad": {
      "x": 280,
      "y": 260,
      "w": 20,
      "h": 26
    },
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": []
  },
  "41": {
    "title": "CHAMBER 41: DRAG THE EXIT EMOJI",
    "hint": "NO DOOR INSIDE? DRAG THE 🚪 EMOJI FROM THE TOP TITLE BANNER INTO THE ROOM!",
    "puzzleType": "EMOJI_DOOR",
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
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "emojiDoor": true
  },
  "42": {
    "title": "CHAMBER 42: BLOW AWAY DEBRIS",
    "hint": "SWIPE RAPIDLY BACK AND FORTH OVER THE DUST PILE TO UNCOVER THE HIDDEN TRAPDOOR!",
    "puzzleType": "DEBRIS_SWIPE",
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
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "debrisPile": {
      "x": 220,
      "y": 285,
      "w": 60,
      "h": 20,
      "cleared": false
    }
  },
  "43": {
    "title": "CHAMBER 43: SHATTER THE MIRROR",
    "hint": "THE VISIBLE DOOR IS A REFLECTION! TAP THE MIRROR GLASS TO SHATTER IT AND REVEAL THE EXIT!",
    "puzzleType": "MIRROR_SHATTER",
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
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "mirrorDoor": {
      "x": 310,
      "y": 254,
      "shattered": false
    }
  },
  "44": {
    "title": "CHAMBER 44: ELECTRICAL TAPE",
    "hint": "DRAG THE BLACK ELECTRICAL TAPE ONTO THE SEVERED SPARKING WIRE TO RESTORE ELEVATOR POWER!",
    "puzzleType": "WIRE_TAPE",
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
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "severedWire": {
      "x": 180,
      "y": 260,
      "taped": false
    },
    "tapeRoll": {
      "x": 80,
      "y": 270,
      "isDraggable": true
    }
  },
  "45": {
    "title": "CHAMBER 45: SLEDGEHAMMER WALL",
    "hint": "GRAB THE SLEDGEHAMMER AND STRIKE THE CRACKED BRICK WALL 3 TIMES TO SMASH THROUGH!",
    "puzzleType": "SLEDGEHAMMER",
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
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "crackedWall": {
      "x": 180,
      "y": 160,
      "w": 16,
      "h": 140,
      "hits": 0
    },
    "sledgehammer": {
      "x": 80,
      "y": 270,
      "isDraggable": true
    }
  },
  "46": {
    "title": "CHAMBER 46: SOLAR BEAM REFLECTION",
    "hint": "ANGLE THE POCKET MIRROR TO BOUNCE THE SKYLIGHT BEAM INTO THE DARK SOLAR SENSOR!",
    "puzzleType": "POCKET_MIRROR",
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
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "pocketMirror": {
      "x": 80,
      "y": 270,
      "isDraggable": true
    },
    "skylightBeam": {
      "x": 180,
      "y": 0
    }
  },
  "47": {
    "title": "CHAMBER 47: TIME-REWIND CLOCK",
    "hint": "TAP THE REWIND CLOCK TO RESTORE THE FALLEN DRAWBRIDGE BACK TO FULL ELEVATION!",
    "puzzleType": "TIME_REWIND",
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
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "rewindClock": {
      "x": 180,
      "y": 140,
      "tapped": false
    }
  },
  "48": {
    "title": "CHAMBER 48: GLIDING UMBRELLA",
    "hint": "OPEN THE UMBRELLA TO GLIDE SAFELY ACROSS THE BOTTOMLESS SPIKE PIT!",
    "puzzleType": "UMBRELLA_GLIDE",
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
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "umbrella": {
      "x": 70,
      "y": 270,
      "equipped": false
    }
  },
  "49": {
    "title": "CHAMBER 49: SCREWDRIVER VENT",
    "hint": "DRAG THE SCREWDRIVER ONTO THE 4 VENT SCREWS TO DETACH THE GRATE AND CRAWL IN!",
    "puzzleType": "SCREWDRIVER",
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
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "screwdriver": {
      "x": 70,
      "y": 270,
      "isDraggable": true
    },
    "ventGrate": {
      "x": 200,
      "y": 250,
      "screwsLeft": 4
    }
  },
  "50": {
    "title": "CHAMBER 50: KEY BEHIND PAUSE",
    "hint": "DRAG THE PAUSE BUTTON ASIDE IN THE TOP HUD TO REVEAL THE HIDDEN GOLDEN KEY!",
    "puzzleType": "PAUSE_BEHIND_KEY",
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
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "pauseBehindKey": true
  },
  "51": {
    "title": "CHAMBER 51: FLASHLIGHT PHANTOM",
    "hint": "SHINE THE FLASHLIGHT BEAM AT THE SHADOW PHANTOM BLOCKING THE DOOR TO DISSOLVE IT!",
    "puzzleType": "FLASHLIGHT",
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
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "flashlight": {
      "x": 70,
      "y": 270,
      "on": false
    },
    "phantomWall": {
      "x": 200,
      "y": 160,
      "dissolved": false
    }
  },
  "52": {
    "title": "CHAMBER 52: SUPER GLUE KEY",
    "hint": "DRAG THE TWO SNAPPED HALVES OF THE KEY TOGETHER WITH SUPER GLUE TO MEND IT!",
    "puzzleType": "GLUE_KEY",
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
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "keyHalf1": {
      "x": 90,
      "y": 275
    },
    "keyHalf2": {
      "x": 140,
      "y": 275
    },
    "glue": {
      "x": 70,
      "y": 270,
      "isDraggable": true
    }
  },
  "53": {
    "title": "CHAMBER 53: CLEAN KEYPAD SMUDGE",
    "hint": "RUB YOUR FINGER OVER THE DIRTY KEYPAD TO READ THE HIGHLIGHTED CODE COMBINATION!",
    "puzzleType": "SMUDGED_KEYPAD",
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
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "smudgedPad": {
      "x": 270,
      "y": 260,
      "clean": false
    }
  },
  "54": {
    "title": "CHAMBER 54: SIPHON DRAINAGE",
    "hint": "CONNECT THE SIPHON HOSE FROM THE WATER TANK TO THE DRAIN TO LOWER THE FLOOD LEVEL!",
    "puzzleType": "SIPHON_HOSE",
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
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "siphonHose": {
      "x": 80,
      "y": 270,
      "connected": false
    }
  },
  "55": {
    "title": "CHAMBER 55: CATAPULT SEESAW",
    "hint": "DROP THE HEAVY CRATE FROM THE TOWER ONTO THE SEESAW TO CATAPULT YOURSELF UPWARD!",
    "puzzleType": "SEESAW_CATAPULT",
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
        "id": "c_heavy",
        "x": 60,
        "y": 120
      }
    ],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "seesaw": {
      "x": 160,
      "y": 285,
      "w": 90,
      "h": 10
    }
  },
  "56": {
    "title": "CHAMBER 56: BRIBE THE ROBOT",
    "hint": "DRAG A GOLDEN CYBER COIN TO THE SENTRY BOT SO IT DISENGAGES THE SECURITY GATE!",
    "puzzleType": "ROBOT_BRIBE",
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
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "robotGuard": {
      "x": 220,
      "y": 260,
      "bribed": false
    },
    "goldCoin": {
      "x": 80,
      "y": 270,
      "isDraggable": true
    }
  },
  "57": {
    "title": "CHAMBER 57: DYNAMITE BLAST",
    "hint": "PLACE THE DYNAMITE STICK BY THE BOULDER AND IGNITE THE FUSE TO CLEAR THE PATH!",
    "puzzleType": "DYNAMITE",
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
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "dynamite": {
      "x": 80,
      "y": 270,
      "isDraggable": true
    },
    "boulder": {
      "x": 200,
      "y": 240,
      "w": 45,
      "h": 60
    }
  },
  "58": {
    "title": "CHAMBER 58: RADIO FREQUENCY",
    "hint": "ROTATE THE RADIO TUNER KNOB TO 98.5 MHZ TO BROADCAST THE UNLOCK SIGNAL!",
    "puzzleType": "RADIO_TUNER",
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
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "radio": {
      "x": 150,
      "y": 260,
      "freq": 88,
      "targetFreq": 98.5
    }
  },
  "59": {
    "title": "CHAMBER 59: SHADOW SILHOUETTE",
    "hint": "STAND DIRECTLY IN FRONT OF THE SPOTLIGHT SO YOUR SHADOW FILLS THE WALL SENSOR!",
    "puzzleType": "SHADOW_MATCH",
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
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "spotlight": {
      "x": 50,
      "y": 270
    },
    "shadowTarget": {
      "x": 250,
      "y": 250
    }
  },
  "60": {
    "title": "CHAMBER 60: ICE CUBE THERMOSTAT",
    "hint": "DRAG AN ICE CUBE ONTO THE TEMPERATURE PROBE TO CHILL THE ROOM AND OPEN THE CRYOCELL!",
    "puzzleType": "ICE_THERMOSTAT",
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
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "thermostat": {
      "x": 220,
      "y": 240,
      "cold": false
    },
    "iceCube": {
      "x": 80,
      "y": 270,
      "isDraggable": true
    }
  },
  "61": {
    "title": "CHAMBER 61: DISCO BALL REFLECTION",
    "hint": "LOWER THE DISCO BALL INTO THE LASER TO SCATTER LIGHT ONTO 4 WALL SENSORS AT ONCE!",
    "puzzleType": "DISCO_BALL",
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
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "discoBall": {
      "x": 180,
      "y": 80,
      "lowered": false
    }
  },
  "62": {
    "title": "CHAMBER 62: MORSE TELEGRAPH",
    "hint": "TAP THE TELEGRAPH KEY IN S-O-S RHYTHM (... --- ...) TO TRANSMIT THE OVERRIDE CODE!",
    "puzzleType": "MORSE_CODE",
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
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "morseKey": {
      "x": 150,
      "y": 270,
      "seq": ""
    }
  },
  "63": {
    "title": "CHAMBER 63: WATER PIPE ROTATION",
    "hint": "ROTATE THE 3 WATER PIPE ELBOWS TO CHANNEL LIQUID INTO THE GENERATOR TURBINE!",
    "puzzleType": "PIPE_ROTATION",
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
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "pipes": [
      {
        "id": "p1",
        "angle": 0
      },
      {
        "id": "p2",
        "angle": 90
      },
      {
        "id": "p3",
        "angle": 180
      }
    ]
  },
  "64": {
    "title": "CHAMBER 64: JACK IN THE BOX",
    "hint": "WIND THE CRANK ON THE MYSTERY BOX UNTIL THE JESTER POPS OUT BEARING THE KEY!",
    "puzzleType": "JACK_BOX",
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
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "jackBox": {
      "x": 180,
      "y": 260,
      "cranks": 0
    }
  },
  "65": {
    "title": "CHAMBER 65: LAVA STEPPING STONES",
    "hint": "THROW OBSIDIAN SLABS INTO THE MOLTEN LAVA TO CREATE A SAFE PATHWAY ACROSS!",
    "puzzleType": "LAVA_STONES",
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
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "stoneSlabs": [
      {
        "id": "s1",
        "x": 80,
        "y": 270,
        "isDraggable": true
      }
    ]
  },
  "66": {
    "title": "CHAMBER 66: EXTINGUISHER JETPACK",
    "hint": "SPRAY THE FIRE EXTINGUISHER DOWNWARD TO JET-PROPEL OVER THE HIGH STEEL WALL!",
    "puzzleType": "EXTINGUISHER_JET",
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
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "fireExtinguisher": {
      "x": 80,
      "y": 270,
      "taken": false
    }
  },
  "67": {
    "title": "CHAMBER 67: X-RAY SCANNER",
    "hint": "DRAG THE PORTABLE X-RAY OVER THE 3 STEEL SAFES TO FIND WHICH CONTAINS THE KEY!",
    "puzzleType": "XRAY_SCANNER",
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
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "xrayScanner": {
      "x": 80,
      "y": 270,
      "isDraggable": true
    },
    "safes": [
      {
        "id": "sf1"
      },
      {
        "id": "sf2",
        "hasKey": true
      },
      {
        "id": "sf3"
      }
    ]
  },
  "68": {
    "title": "CHAMBER 68: CRYSTAL RESONANCE",
    "hint": "PLUCK THE HIGH GUITAR STRING AT THE RESONANT FREQUENCY TO SHATTER THE CRYSTAL GATE!",
    "puzzleType": "GUITAR_RESONANCE",
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
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "acousticGuitar": {
      "x": 80,
      "y": 260,
      "plucked": false
    }
  },
  "69": {
    "title": "CHAMBER 69: BICYCLE AIR PUMP",
    "hint": "PUMP THE AIR PUMP 3 TIMES TO INFLATE A RUBBER RAFT BRIDGE OVER THE SPIKES!",
    "puzzleType": "AIR_PUMP",
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
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "airPump": {
      "x": 80,
      "y": 270,
      "pumps": 0
    }
  },
  "70": {
    "title": "CHAMBER 70: CUT GREEN WIRE",
    "hint": "USE THE WIRE SNIPS TO CUT THE GREEN WIRE BEFORE THE 10-SECOND LOCKDOWN OCCURS!",
    "puzzleType": "CUT_WIRE",
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
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "wireBox": {
      "x": 180,
      "y": 250,
      "wires": [
        "RED",
        "BLUE",
        "GREEN"
      ],
      "cutWire": null
    }
  },
  "71": {
    "title": "CHAMBER 71: PINBALL FLIPPER",
    "hint": "PULL BACK THE PINBALL SPRING PLUNGER TO LAUNCH YOURSELF INTO THE HIGH EXIT CHUTE!",
    "puzzleType": "PINBALL_LAUNCH",
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
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "pinballPlunger": {
      "x": 60,
      "y": 280,
      "pulled": false
    }
  },
  "72": {
    "title": "CHAMBER 72: STETHOSCOPE SAFE",
    "hint": "LISTEN CLOSELY FOR THE AUDIBLE CLICK AS YOU TURN THE SAFE DIAL TO CRACK THE CODE!",
    "puzzleType": "STETHOSCOPE",
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
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "safeDial": {
      "x": 180,
      "y": 250,
      "cracked": false
    }
  },
  "73": {
    "title": "CHAMBER 73: KITE LIGHTNING ROD",
    "hint": "FLY THE METAL KITE INTO THE THUNDERCLOUD TO HARNESS A LIGHTNING VOLT FOR THE DOOR!",
    "puzzleType": "KITE_LIGHTNING",
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
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "metalKite": {
      "x": 80,
      "y": 270,
      "flown": false
    }
  },
  "74": {
    "title": "CHAMBER 74: SHOP VACUUM SUCTION",
    "hint": "TURN ON THE SHOP VACUUM TO SUCK THE HIGH FLOATING FEATHER KEY DOWN TO YOU!",
    "puzzleType": "VACUUM_SUCTION",
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
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "shopVac": {
      "x": 80,
      "y": 270,
      "on": false
    }
  },
  "75": {
    "title": "CHAMBER 75: GRAVITY SINGULARITY",
    "hint": "TOSS THE MINIATURE BLACK HOLE ORB TO PULL AND CRUSH ALL SPIKES INTO HARMLESS METAL!",
    "puzzleType": "BLACK_HOLE",
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
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "blackHoleOrb": {
      "x": 80,
      "y": 270,
      "isDraggable": true
    }
  },
  "76": {
    "title": "CHAMBER 76: RUNIC SYMBOL MATCH",
    "hint": "SWAP 3 GLOWING CYAN RUNES ON THE ANCIENT DOORWAY ARCH TO TRIGGER ITS ANCIENT MAGIC!",
    "puzzleType": "RUNE_MATCH",
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
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "runes": [
      {
        "id": "r1",
        "symbol": "A"
      },
      {
        "id": "r2",
        "symbol": "A"
      },
      {
        "id": "r3",
        "symbol": "A"
      }
    ]
  },
  "77": {
    "title": "CHAMBER 77: FISHING ROD REEL",
    "hint": "CAST THE FISHING HOOK OVER THE PERIMETER FENCE TO SNAG THE GOLDEN KEY RING!",
    "puzzleType": "FISHING_ROD",
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
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "fishingRod": {
      "x": 80,
      "y": 270,
      "cast": false
    }
  },
  "78": {
    "title": "CHAMBER 78: UV INVISIBLE INK",
    "hint": "PAINT UV DEVELOPER FLUID ONTO THE BLANK CONCRETE WALL TO REVEAL THE HIDDEN DOORWAY!",
    "puzzleType": "UV_PAINT",
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
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "uvBrush": {
      "x": 80,
      "y": 270,
      "isDraggable": true
    }
  },
  "79": {
    "title": "CHAMBER 79: DOMINO CASCADE",
    "hint": "PUSH OVER THE GIANT LEAD DOMINO TO TRIGGER A CHAIN REACTION THAT TOPPLES THE BRIDGE!",
    "puzzleType": "DOMINO_TOPPLE",
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
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "dominos": [
      {
        "id": "d1",
        "toppled": false
      }
    ]
  },
  "80": {
    "title": "CHAMBER 80: SHRINK RAY ZAP",
    "hint": "ZAP YOURSELF WITH THE MINIATURIZING SHRINK RAY TO CRAWL THROUGH THE TINY MOUSE HOLE!",
    "puzzleType": "SHRINK_RAY",
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
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "shrinkRay": {
      "x": 80,
      "y": 270,
      "active": false
    }
  },
  "81": {
    "title": "CHAMBER 81: PRISM RAINBOW SPLIT",
    "hint": "ALIGN THE TRIANGULAR GLASS PRISM TO SPLIT WHITE LIGHT INTO 3 DISTINCT COLOR BEAMS!",
    "puzzleType": "RAINBOW_PRISM",
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
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "glassPrism": {
      "x": 80,
      "y": 270,
      "isDraggable": true
    }
  },
  "82": {
    "title": "CHAMBER 82: WRECKING PENDULUM",
    "hint": "SWING THE HEAVY IRON WRECKING PENDULUM TO SMASH APART THE REINFORCED BRICK WALL!",
    "puzzleType": "WRECKING_BALL",
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
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "wreckingBall": {
      "x": 180,
      "y": 60,
      "swung": false
    }
  },
  "83": {
    "title": "CHAMBER 83: SOAP BUBBLE FLOAT",
    "hint": "BLOW A GIANT PROTECTIVE SOAP BUBBLE AROUND YOURSELF TO FLOAT GENTLY OVER THE LASERS!",
    "puzzleType": "SOAP_BUBBLE",
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
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "bubbleWand": {
      "x": 80,
      "y": 270,
      "blown": false
    }
  },
  "84": {
    "title": "CHAMBER 84: BIOMETRIC WARMTH",
    "hint": "HOLD YOUR FINGER ON THE THERMAL SCANNER FOR 3 SECONDS TO REGISTER YOUR BODY HEAT!",
    "puzzleType": "BIOMETRIC_HEAT",
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
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "biometricScanner": {
      "x": 260,
      "y": 250,
      "heated": false
    }
  },
  "85": {
    "title": "CHAMBER 85: METRONOME RHYTHM",
    "hint": "STRIDE ACROSS THE RHYTHM PLATES EXACTLY IN SYNC WITH THE TICKING METRONOME!",
    "puzzleType": "METRONOME_STEP",
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
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "metronome": {
      "x": 180,
      "y": 40,
      "bpm": 80
    }
  },
  "86": {
    "title": "CHAMBER 86: LUBRICATING OIL CAN",
    "hint": "SQUIRT MOTOR OIL ONTO THE RUSTED DOOR COG TO ALLOW THE HEAVY GEAR TO TURN!",
    "puzzleType": "OIL_CAN",
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
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "oilCan": {
      "x": 80,
      "y": 270,
      "isDraggable": true
    }
  },
  "87": {
    "title": "CHAMBER 87: KALEIDOSCOPE KEY",
    "hint": "TURN THE KALEIDOSCOPE CYLINDER UNTIL THE GEOMETRIC PATTERNS FORM A KEYHOLE SHAPE!",
    "puzzleType": "KALEIDOSCOPE",
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
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "kaleidoscope": {
      "x": 180,
      "y": 240,
      "aligned": false
    }
  },
  "88": {
    "title": "CHAMBER 88: PAPER AIRPLANE",
    "hint": "FOLD AND THROW A PAPER AIRPLANE ACROSS THE GAP TO STRIKE THE REMOTE TOGGLE SWITCH!",
    "puzzleType": "PAPER_AIRPLANE",
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
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "paperPlane": {
      "x": 80,
      "y": 270,
      "thrown": false
    }
  },
  "89": {
    "title": "CHAMBER 89: TESLA ARREST ROD",
    "hint": "HOLD THE COPPER LIGHTNING ROD TO CHANNEL THE HIGH-VOLTAGE SPARK INTO THE RECEIVER!",
    "puzzleType": "TESLA_ROD",
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
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "copperRod": {
      "x": 80,
      "y": 270,
      "isDraggable": true
    }
  },
  "90": {
    "title": "CHAMBER 90: SUNDIAL SHADOW",
    "hint": "MOVE THE SUN SPOTLIGHT UNTIL THE SUNDIAL GNOMON SHADOW POINTS DIRECTLY AT NOON (XII)!",
    "puzzleType": "SUNDIAL_ALIGN",
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
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "sunLamp": {
      "x": 80,
      "y": 270,
      "isDraggable": true
    }
  },
  "91": {
    "title": "CHAMBER 91: LIQUID NITROGEN",
    "hint": "SPRAY LIQUID NITROGEN ONTO THE RAGING WATERFALL TO FREEZE IT INTO CLIMBABLE ICE!",
    "puzzleType": "NITROGEN_FREEZE",
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
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "nitrogenSpray": {
      "x": 80,
      "y": 270,
      "sprayed": false
    }
  },
  "92": {
    "title": "CHAMBER 92: CAESAR CIPHER WHEEL",
    "hint": "ROTATE THE CIPHER DISC 3 POSITIONS TO DECODE THE SECRET PASSWORD 'OPEN'!",
    "puzzleType": "CAESAR_CIPHER",
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
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "cipherDisc": {
      "x": 180,
      "y": 250,
      "rot": 0
    }
  },
  "93": {
    "title": "CHAMBER 93: BOWLING BALL STRIKE",
    "hint": "ROLL THE HEAVY CYBER BOWLING BALL DOWN THE ALLEY TO STRIKE DOWN ALL 10 LASER PINS!",
    "puzzleType": "BOWLING_STRIKE",
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
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "bowlingBall": {
      "x": 80,
      "y": 270,
      "rolled": false
    }
  },
  "94": {
    "title": "CHAMBER 94: ARCHIMEDES SCREW",
    "hint": "CRANK THE SPIRAL ARCHIMEDES WATER SCREW TO FLOOD THE LOWER BASIN AND FLOAT THE RAFT!",
    "puzzleType": "ARCHIMEDES_PUMP",
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
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "waterScrew": {
      "x": 180,
      "y": 250,
      "cranked": false
    }
  },
  "95": {
    "title": "CHAMBER 95: MAGLEV TRACK CHARGE",
    "hint": "CHARGE THE ELECTROMAGNETIC RAILS TO LEVITATE THE HOVER PLATFORM ACROSS THE CHASM!",
    "puzzleType": "MAGLEV_CHARGE",
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
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "maglevSwitch": {
      "x": 80,
      "y": 270,
      "charged": false
    }
  },
  "96": {
    "title": "CHAMBER 96: CAMOUFLAGE SUIT",
    "hint": "TAP THE COLOR PALETTE TO MATCH YOUR CYBER SUIT TO THE WALL AND SNEAK PAST THE CAMERA!",
    "puzzleType": "CAMOUFLAGE",
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
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "camoSuit": {
      "x": 80,
      "y": 270,
      "matched": false
    }
  },
  "97": {
    "title": "CHAMBER 97: BOOMBOX GROOVE",
    "hint": "DROP THE 80S BOOMBOX ON THE DANCE FLOOR TO MAKE THE LASERS GROOVE INTO ARCHWAYS!",
    "puzzleType": "BOOMBOX_BEAT",
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
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "boombox": {
      "x": 160,
      "y": 270,
      "playing": false
    }
  },
  "98": {
    "title": "CHAMBER 98: HOLOGRAM UNPLUG",
    "hint": "UNPLUG THE CONCEALED HOLOGRAM PROJECTOR TO REVEAL THE SOLID WALL IS JUST A PROJECTION!",
    "puzzleType": "HOLOGRAM_UNPLUG",
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
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "holoProjector": {
      "x": 240,
      "y": 280,
      "plugged": true
    }
  },
  "99": {
    "title": "CHAMBER 99: CHESS KNIGHT DEFLECT",
    "hint": "MOVE THE MIRRORED CHESS KNIGHT PIECE TO REFLECT THE LASER INTO THE KING'S CROWN!",
    "puzzleType": "CHESS_KNIGHT",
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
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "chessKnight": {
      "x": 150,
      "y": 260,
      "isDraggable": true
    }
  },
  "100": {
    "title": "CHAMBER 100: THE MASTER TROPHY ESCAPE",
    "hint": "THE ULTIMATE LOCK: DRAG THE LEVEL 100 GOLDEN TROPHY FROM HUD INTO THE MASTER VAULT!",
    "puzzleType": "MASTER_FINALE",
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
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "masterTrophySocket": {
      "x": 310,
      "y": 220,
      "filled": false
    },
    "masterHudTrophy": true
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
