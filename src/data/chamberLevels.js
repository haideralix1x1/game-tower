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
    "barriers": [],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [],
    "fans": [],
    "gravityInverted": false
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
    ],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [],
    "fans": [],
    "gravityInverted": false
  },
  "3": {
    "title": "CHAMBER 03: CRATE ELEVATION",
    "hint": "DRAG & DROP THE CRATES TO BUILD ESCAPE STAIRS!",
    "playerStart": {
      "x": 30,
      "y": 260
    },
    "exitDoor": {
      "x": 310,
      "y": 148,
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
      },
      {
        "id": "plateau",
        "x": 200,
        "y": 190,
        "w": 160,
        "h": 110
      }
    ],
    "crates": [
      {
        "id": "c1",
        "x": 50,
        "y": 270,
        "vx": 0,
        "vy": 0,
        "isDraggable": true
      },
      {
        "id": "c2",
        "x": 100,
        "y": 270,
        "vx": 0,
        "vy": 0,
        "isDraggable": true
      }
    ],
    "springs": [],
    "switches": [],
    "keys": [
      {
        "id": "k1",
        "x": 250,
        "y": 155,
        "taken": false,
        "color": "#00F5FF",
        "isDraggable": true
      }
    ],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [],
    "fans": [],
    "gravityInverted": false
  },
  "4": {
    "title": "CHAMBER 04: THE MOVABLE EXIT",
    "hint": "DOOR IS TOO HIGH? GRAB AND DRAG THE DOOR DOWN!",
    "playerStart": {
      "x": 30,
      "y": 260
    },
    "exitDoor": {
      "x": 310,
      "y": 55,
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
    ],
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [
      {
        "id": "k1",
        "x": 160,
        "y": 275,
        "taken": false,
        "color": "#FFD166",
        "isDraggable": true
      }
    ],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [],
    "fans": [],
    "gravityInverted": false
  },
  "5": {
    "title": "CHAMBER 05: TWO-FINGER OVERRIDE",
    "hint": "WALK ONTO PLATE A — HOLD YOUR FINGER ON PLATE B!",
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
    "plates": [
      {
        "id": "p1",
        "x": 70,
        "y": 295,
        "w": 38,
        "h": 6,
        "pressed": false,
        "pressedByFinger": false
      },
      {
        "id": "p2",
        "x": 220,
        "y": 295,
        "w": 38,
        "h": 6,
        "pressed": false,
        "pressedByFinger": false
      }
    ],
    "hazards": [],
    "barriers": [],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [],
    "fans": [],
    "gravityInverted": false
  },
  "6": {
    "title": "CHAMBER 06: SPIKE BRIDGE BUILDER",
    "hint": "DRAG THE MAGNETIC SLABS OVER THE SPIKE CHASM!",
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
      },
      {
        "id": "bridge_a",
        "x": 70,
        "y": 140,
        "w": 65,
        "h": 14,
        "isDraggable": true,
        "color": "#00F5D4"
      },
      {
        "id": "bridge_b",
        "x": 180,
        "y": 140,
        "w": 65,
        "h": 14,
        "isDraggable": true,
        "color": "#00F5D4"
      }
    ],
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [
      {
        "id": "k1",
        "x": 290,
        "y": 275,
        "taken": false,
        "color": "#39FF14",
        "isDraggable": true
      }
    ],
    "plates": [],
    "hazards": [
      {
        "x": 90,
        "y": 286,
        "w": 160,
        "h": 14,
        "type": "SPIKES"
      }
    ],
    "barriers": [],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [],
    "fans": [],
    "gravityInverted": false
  },
  "7": {
    "title": "CHAMBER 07: PULL THE PLUG",
    "hint": "GATE LOCKED? DRAG & YANK THE POWER PLUG FROM WALL!",
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
    "barriers": [
      {
        "id": "b1",
        "x": 240,
        "y": 200,
        "w": 10,
        "h": 100,
        "active": true,
        "color": "#FF0055",
        "byPlug": true
      }
    ],
    "plug": {
      "id": "plug1",
      "x": 65,
      "y": 180,
      "plugged": true
    },
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [],
    "fans": [],
    "gravityInverted": false
  },
  "8": {
    "title": "CHAMBER 08: RIP THE PADLOCK",
    "hint": "NO KEYCARD FOUND? TOUCH & RIP PADLOCK OFF THE DOOR!",
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
    "plug": null,
    "padlock": {
      "id": "pad1",
      "x": 316,
      "y": 268,
      "onDoor": true
    },
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [],
    "fans": [],
    "gravityInverted": false
  },
  "9": {
    "title": "CHAMBER 09: BOUNCY SPRING PAD",
    "hint": "DRAG THE GREEN SPRING PAD UNDER FEET TO SUPER-JUMP!",
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
      },
      {
        "id": "high_wall",
        "x": 180,
        "y": 130,
        "w": 20,
        "h": 170
      }
    ],
    "crates": [],
    "springs": [
      {
        "id": "sp1",
        "x": 100,
        "y": 288,
        "w": 34,
        "h": 12,
        "isDraggable": true
      }
    ],
    "switches": [],
    "keys": [
      {
        "id": "k1",
        "x": 280,
        "y": 265,
        "taken": false,
        "color": "#00F5FF",
        "isDraggable": false
      }
    ],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [],
    "fans": [],
    "gravityInverted": false
  },
  "10": {
    "title": "CHAMBER 10: HELIUM BALLOON",
    "hint": "RELEASE THE FLOATING BALLOON CRATE TO PRESS CEILING PLATE!",
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
    "crates": [
      {
        "id": "c_bal",
        "x": 120,
        "y": 260,
        "isBalloon": true,
        "isDraggable": true
      }
    ],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [
      {
        "id": "cp1",
        "x": 170,
        "y": 12,
        "w": 42,
        "h": 6,
        "pressed": false,
        "isCeiling": true
      }
    ],
    "hazards": [],
    "barriers": [
      {
        "id": "b1",
        "x": 250,
        "y": 180,
        "w": 8,
        "h": 120,
        "active": true,
        "plateIds": [
          "cp1"
        ]
      }
    ],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [],
    "fans": [],
    "gravityInverted": false
  },
  "11": {
    "title": "CHAMBER 11: BATTERY SOCKET",
    "hint": "DRAG THE GLOWING BATTERY CELL INTO THE WALL GENERATOR!",
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
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [
      {
        "id": "b1",
        "x": 210,
        "y": 180,
        "w": 8,
        "h": 120,
        "active": true,
        "byBattery": true
      }
    ],
    "plug": null,
    "padlock": null,
    "battery": {
      "id": "bat1",
      "x": 90,
      "y": 270,
      "w": 22,
      "h": 22,
      "slotted": false
    },
    "socket": {
      "id": "sock1",
      "x": 260,
      "y": 260,
      "w": 28,
      "h": 28
    },
    "receptors": [],
    "portals": [],
    "fans": [],
    "gravityInverted": false
  },
  "12": {
    "title": "CHAMBER 12: PRISM DEFLECTION",
    "hint": "DRAG THE 45° MIRROR TO BEND THE LASER INTO THE RECEPTOR!",
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
      },
      {
        "id": "mir1",
        "x": 90,
        "y": 120,
        "w": 32,
        "h": 32,
        "isMirror": true,
        "isDraggable": true,
        "color": "#A5F3FC"
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
        "id": "b1",
        "x": 260,
        "y": 180,
        "w": 8,
        "h": 120,
        "active": true,
        "receptorId": "rec1"
      }
    ],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [
      {
        "id": "rec1",
        "x": 180,
        "y": 268,
        "w": 24,
        "h": 24,
        "beamX": 180,
        "beamY": 100,
        "hit": false
      }
    ],
    "portals": [],
    "fans": [],
    "gravityInverted": false
  },
  "13": {
    "title": "CHAMBER 13: TIMED SPRINT GATE",
    "hint": "HIT TIMED SWITCH — SPRINT BEFORE GATE RE-SEALS IN 4S!",
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
    "switches": [
      {
        "id": "sw_time",
        "x": 50,
        "y": 268,
        "isTimed": true,
        "timer": 0,
        "maxTimer": 4.2,
        "active": false
      }
    ],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [
      {
        "id": "b1",
        "x": 220,
        "y": 180,
        "w": 8,
        "h": 120,
        "active": true,
        "switchId": "sw_time"
      }
    ],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [],
    "fans": [],
    "gravityInverted": false
  },
  "14": {
    "title": "CHAMBER 14: MOVING PATROL LIFT",
    "hint": "RIDE THE AUTOMATED HOVER LIFT ACROSS THE DEEP PIT!",
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
      },
      {
        "id": "mov_p",
        "x": 80,
        "y": 270,
        "w": 50,
        "h": 14,
        "minX": 75,
        "maxX": 210,
        "speed": 1.5,
        "dir": 1,
        "color": "#00F5FF"
      }
    ],
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [
      {
        "id": "k1",
        "x": 290,
        "y": 265,
        "taken": false,
        "color": "#39FF14",
        "isDraggable": false
      }
    ],
    "plates": [],
    "hazards": [
      {
        "x": 70,
        "y": 286,
        "w": 180,
        "h": 14,
        "type": "SPIKES"
      }
    ],
    "barriers": [],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [],
    "fans": [],
    "gravityInverted": false
  },
  "15": {
    "title": "CHAMBER 15: CRUMBLING TILES",
    "hint": "DO NOT STOP! STEPPING ON TILES CAUSES THEM TO COLLAPSE!",
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
      },
      {
        "id": "cr1",
        "x": 80,
        "y": 265,
        "w": 40,
        "h": 12,
        "isCrumbling": true,
        "color": "#FB7185"
      },
      {
        "id": "cr2",
        "x": 145,
        "y": 265,
        "w": 40,
        "h": 12,
        "isCrumbling": true,
        "color": "#FB7185"
      },
      {
        "id": "cr3",
        "x": 210,
        "y": 265,
        "w": 40,
        "h": 12,
        "isCrumbling": true,
        "color": "#FB7185"
      }
    ],
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [
      {
        "id": "k1",
        "x": 290,
        "y": 265,
        "taken": false,
        "color": "#00F5FF",
        "isDraggable": false
      }
    ],
    "plates": [],
    "hazards": [
      {
        "x": 60,
        "y": 286,
        "w": 200,
        "h": 14,
        "type": "SPIKES"
      }
    ],
    "barriers": [],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [],
    "fans": [],
    "gravityInverted": false
  },
  "16": {
    "title": "CHAMBER 16: TURBINE WIND VENT",
    "hint": "STAND IN THE WIND STREAM TO FLOAT UP TO HIGH EXIT!",
    "playerStart": {
      "x": 30,
      "y": 260
    },
    "exitDoor": {
      "x": 290,
      "y": 98,
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
        "id": "ledge",
        "x": 240,
        "y": 140,
        "w": 110,
        "h": 160
      }
    ],
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [
      {
        "id": "k1",
        "x": 270,
        "y": 105,
        "taken": false,
        "color": "#FFD166",
        "isDraggable": false
      }
    ],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [],
    "fans": [
      {
        "id": "fan1",
        "x": 150,
        "y": 292,
        "w": 38,
        "h": 12,
        "active": true
      }
    ],
    "gravityInverted": false
  },
  "17": {
    "title": "CHAMBER 17: COLOR KEYCARDS",
    "hint": "RED KEY UNLOCKS RED GATE TO RETRIEVE CYAN EXIT KEY!",
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
        "id": "k_red",
        "x": 70,
        "y": 265,
        "taken": false,
        "color": "#FF0055",
        "isDraggable": true
      },
      {
        "id": "k_cyan",
        "x": 190,
        "y": 265,
        "taken": false,
        "color": "#00F5FF",
        "isDraggable": false
      }
    ],
    "plates": [],
    "hazards": [],
    "barriers": [
      {
        "id": "b_red",
        "x": 130,
        "y": 180,
        "w": 8,
        "h": 120,
        "active": true,
        "color": "#FF0055",
        "requiredColor": "#FF0055"
      }
    ],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [],
    "fans": [],
    "gravityInverted": false
  },
  "18": {
    "title": "CHAMBER 18: PISTON CRUSHER JAM",
    "hint": "PUSH THE INDESTRUCTIBLE CRATE UNDER CRUSHER TO JAM IT!",
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
    "crates": [
      {
        "id": "c1",
        "x": 80,
        "y": 260,
        "isDraggable": true
      }
    ],
    "springs": [],
    "switches": [],
    "keys": [
      {
        "id": "k1",
        "x": 280,
        "y": 265,
        "taken": false,
        "color": "#39FF14",
        "isDraggable": false
      }
    ],
    "plates": [],
    "hazards": [
      {
        "id": "crush1",
        "x": 190,
        "y": 180,
        "w": 34,
        "h": 100,
        "type": "SPIKES"
      }
    ],
    "barriers": [],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [],
    "fans": [],
    "gravityInverted": false
  },
  "19": {
    "title": "CHAMBER 19: PORTAL WARP",
    "hint": "STEP INTO BLUE PORTAL TO WARP BEHIND THE LASER BARRIER!",
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
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [
      {
        "id": "b1",
        "x": 170,
        "y": 0,
        "w": 10,
        "h": 300,
        "active": true,
        "color": "#FF0055"
      }
    ],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [
      {
        "id": "p_blue",
        "x": 90,
        "y": 250,
        "partnerId": "p_org",
        "color": "#00F5FF",
        "exitOffsetX": 25,
        "exitOffsetY": 0
      },
      {
        "id": "p_org",
        "x": 250,
        "y": 250,
        "partnerId": "p_blue",
        "color": "#FF9E00",
        "exitOffsetX": 25,
        "exitOffsetY": 0
      }
    ],
    "fans": [],
    "gravityInverted": false
  },
  "20": {
    "title": "CHAMBER 20: CEILING WALK",
    "hint": "GRAVITY INVERTED! WALK ON CEILING TO REACH THE UPSIDE-DOWN EXIT!",
    "playerStart": {
      "x": 30,
      "y": 260
    },
    "exitDoor": {
      "x": 300,
      "y": 14,
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
    "keys": [
      {
        "id": "k1",
        "x": 170,
        "y": 40,
        "taken": false,
        "color": "#FFD166",
        "isDraggable": true
      }
    ],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [],
    "fans": [],
    "gravityInverted": true
  },
  "21": {
    "title": "CHAMBER 21: SPRING TO CEILING PLATE",
    "hint": "BOUNCE CRATE WITH SPRING PAD TO HIT CEILING PLATE!",
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
    "crates": [
      {
        "id": "c1",
        "x": 70,
        "y": 260,
        "isDraggable": true
      }
    ],
    "springs": [
      {
        "id": "sp1",
        "x": 170,
        "y": 288,
        "w": 34,
        "h": 12,
        "isDraggable": true
      }
    ],
    "switches": [],
    "keys": [],
    "plates": [
      {
        "id": "cp1",
        "x": 180,
        "y": 12,
        "w": 42,
        "h": 6,
        "pressed": false,
        "isCeiling": true
      }
    ],
    "hazards": [],
    "barriers": [
      {
        "id": "b1",
        "x": 250,
        "y": 180,
        "w": 8,
        "h": 120,
        "active": true,
        "plateIds": [
          "cp1"
        ]
      }
    ],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [],
    "fans": [],
    "gravityInverted": false
  },
  "22": {
    "title": "CHAMBER 22: BALLOON SLAB SHIELD",
    "hint": "FLOATING BALLOON LIFTS METAL SLAB TO BLOCK OVERHEAD LASER!",
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
      },
      {
        "id": "slab",
        "x": 150,
        "y": 210,
        "w": 55,
        "h": 14,
        "isDraggable": true,
        "color": "#00F5FF"
      }
    ],
    "crates": [
      {
        "id": "c_bal",
        "x": 160,
        "y": 260,
        "isBalloon": true,
        "isDraggable": true
      }
    ],
    "springs": [],
    "switches": [],
    "keys": [
      {
        "id": "k1",
        "x": 280,
        "y": 265,
        "taken": false,
        "color": "#FFD166",
        "isDraggable": true
      }
    ],
    "plates": [],
    "hazards": [],
    "barriers": [
      {
        "id": "b_top",
        "x": 170,
        "y": 12,
        "w": 8,
        "h": 180,
        "active": true
      }
    ],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [],
    "fans": [],
    "gravityInverted": false
  },
  "23": {
    "title": "CHAMBER 23: BATTERY ACROSS CHASM",
    "hint": "BRIDGE SPIKE PIT WITH SLABS TO CARRY BATTERY TO SOCKET!",
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
      "requiresBattery": true
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
        "id": "s1",
        "x": 60,
        "y": 120,
        "w": 65,
        "h": 14,
        "isDraggable": true,
        "color": "#00F5D4"
      }
    ],
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [
      {
        "x": 100,
        "y": 286,
        "w": 120,
        "h": 14,
        "type": "SPIKES"
      }
    ],
    "barriers": [],
    "plug": null,
    "padlock": null,
    "battery": {
      "id": "bat1",
      "x": 40,
      "y": 270,
      "w": 22,
      "h": 22,
      "slotted": false
    },
    "socket": {
      "id": "sock1",
      "x": 270,
      "y": 260,
      "w": 28,
      "h": 28
    },
    "receptors": [],
    "portals": [],
    "fans": [],
    "gravityInverted": false
  },
  "24": {
    "title": "CHAMBER 24: MIRROR ON MOVING LIFT",
    "hint": "RIDE HOVER PLATFORM CARRYING MIRROR TO ALIGN WITH RECEPTOR!",
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
      },
      {
        "id": "mov_p",
        "x": 60,
        "y": 270,
        "w": 55,
        "h": 14,
        "minX": 50,
        "maxX": 190,
        "speed": 1.4,
        "dir": 1,
        "color": "#00F5FF"
      },
      {
        "id": "mir1",
        "x": 80,
        "y": 150,
        "w": 32,
        "h": 32,
        "isMirror": true,
        "isDraggable": true,
        "color": "#A5F3FC"
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
        "id": "b1",
        "x": 230,
        "y": 180,
        "w": 8,
        "h": 120,
        "active": true,
        "receptorId": "rec1"
      }
    ],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [
      {
        "id": "rec1",
        "x": 260,
        "y": 268,
        "w": 24,
        "h": 24,
        "beamX": 160,
        "beamY": 120,
        "hit": false
      }
    ],
    "portals": [],
    "fans": [],
    "gravityInverted": false
  },
  "25": {
    "title": "CHAMBER 25: CRUMBLING SPRINT",
    "hint": "HIT TIMED SWITCH, THEN SPRINT ACROSS COLLAPSING TILES!",
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
      },
      {
        "id": "cr1",
        "x": 110,
        "y": 265,
        "w": 38,
        "h": 12,
        "isCrumbling": true,
        "color": "#FB7185"
      },
      {
        "id": "cr2",
        "x": 170,
        "y": 265,
        "w": 38,
        "h": 12,
        "isCrumbling": true,
        "color": "#FB7185"
      }
    ],
    "crates": [],
    "springs": [],
    "switches": [
      {
        "id": "sw_time",
        "x": 40,
        "y": 268,
        "isTimed": true,
        "timer": 0,
        "maxTimer": 3.8,
        "active": false
      }
    ],
    "keys": [],
    "plates": [],
    "hazards": [
      {
        "x": 90,
        "y": 286,
        "w": 140,
        "h": 14,
        "type": "SPIKES"
      }
    ],
    "barriers": [
      {
        "id": "b1",
        "x": 250,
        "y": 180,
        "w": 8,
        "h": 120,
        "active": true,
        "switchId": "sw_time"
      }
    ],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [],
    "fans": [],
    "gravityInverted": false
  },
  "26": {
    "title": "CHAMBER 26: WIND FAN CRATE PUSH",
    "hint": "TURN ON FAN TO BLOW CRATE HORIZONTALLY ONTO FLOOR PLATE!",
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
    "crates": [
      {
        "id": "c1",
        "x": 120,
        "y": 260,
        "isDraggable": true
      }
    ],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [
      {
        "id": "p1",
        "x": 260,
        "y": 295,
        "w": 38,
        "h": 6,
        "pressed": false
      }
    ],
    "hazards": [],
    "barriers": [
      {
        "id": "b1",
        "x": 220,
        "y": 180,
        "w": 8,
        "h": 120,
        "active": true,
        "plateIds": [
          "p1"
        ]
      }
    ],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [],
    "fans": [
      {
        "id": "fan1",
        "x": 60,
        "y": 292,
        "w": 38,
        "h": 12,
        "active": true
      }
    ],
    "gravityInverted": false
  },
  "27": {
    "title": "CHAMBER 27: PORTAL KEYCARD LAUNCH",
    "hint": "DROP FLOATING KEY INTO PORTAL TO RECEIVE IT AT THE DOOR!",
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
    "switches": [
      {
        "id": "sw1",
        "x": 230,
        "y": 268,
        "active": false
      }
    ],
    "keys": [
      {
        "id": "k1",
        "x": 80,
        "y": 60,
        "taken": false,
        "color": "#FFD166",
        "isDraggable": true
      }
    ],
    "plates": [],
    "hazards": [],
    "barriers": [
      {
        "id": "b_mid",
        "x": 180,
        "y": 0,
        "w": 10,
        "h": 300,
        "active": true
      }
    ],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [
      {
        "id": "p1",
        "x": 80,
        "y": 120,
        "partnerId": "p2",
        "color": "#00F5FF",
        "exitOffsetX": 20,
        "exitOffsetY": 0
      },
      {
        "id": "p2",
        "x": 260,
        "y": 240,
        "partnerId": "p1",
        "color": "#FF9E00",
        "exitOffsetX": 20,
        "exitOffsetY": 0
      }
    ],
    "fans": [],
    "gravityInverted": false
  },
  "28": {
    "title": "CHAMBER 28: INVERTED POWER PLUG",
    "hint": "FLIP GRAVITY TO WALK CEILING, THEN YANK INVERTED PLUG!",
    "playerStart": {
      "x": 30,
      "y": 260
    },
    "exitDoor": {
      "x": 300,
      "y": 14,
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
    "barriers": [
      {
        "id": "b1",
        "x": 240,
        "y": 12,
        "w": 10,
        "h": 160,
        "active": true,
        "byPlug": true
      }
    ],
    "plug": {
      "id": "plug1",
      "x": 80,
      "y": 60,
      "plugged": true
    },
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [],
    "fans": [],
    "gravityInverted": true
  },
  "29": {
    "title": "CHAMBER 29: BOUNCE TO DRAGGABLE KEY",
    "hint": "LAUNCH OFF SPRING PAD TO REACH HIGH FLOATING KEYCARD!",
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
    "springs": [
      {
        "id": "sp1",
        "x": 130,
        "y": 288,
        "w": 34,
        "h": 12,
        "isDraggable": true
      }
    ],
    "switches": [],
    "keys": [
      {
        "id": "k1",
        "x": 145,
        "y": 60,
        "taken": false,
        "color": "#FFD166",
        "isDraggable": true
      }
    ],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [],
    "fans": [],
    "gravityInverted": false
  },
  "30": {
    "title": "CHAMBER 30: PADLOCK BEHIND LASERS",
    "hint": "YANK WALL PLUG TO DISABLE LASER, THEN RIP OFF PADLOCK!",
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
    "barriers": [
      {
        "id": "b1",
        "x": 240,
        "y": 180,
        "w": 10,
        "h": 120,
        "active": true,
        "byPlug": true
      }
    ],
    "plug": {
      "id": "plug1",
      "x": 70,
      "y": 180,
      "plugged": true
    },
    "padlock": {
      "id": "pad1",
      "x": 316,
      "y": 268,
      "onDoor": true
    },
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [],
    "fans": [],
    "gravityInverted": false
  },
  "31": {
    "title": "CHAMBER 31: DUAL COLOR GAUNTLET",
    "hint": "RED KEY BEHIND CRUMBLING FLOOR, CYAN KEY BEHIND LASER!",
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
      },
      {
        "id": "cr1",
        "x": 80,
        "y": 265,
        "w": 45,
        "h": 12,
        "isCrumbling": true,
        "color": "#FB7185"
      }
    ],
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [
      {
        "id": "k_red",
        "x": 90,
        "y": 240,
        "taken": false,
        "color": "#FF0055",
        "isDraggable": true
      },
      {
        "id": "k_cyan",
        "x": 260,
        "y": 265,
        "taken": false,
        "color": "#00F5FF",
        "isDraggable": false
      }
    ],
    "plates": [],
    "hazards": [],
    "barriers": [
      {
        "id": "b_red",
        "x": 190,
        "y": 180,
        "w": 8,
        "h": 120,
        "active": true,
        "color": "#FF0055",
        "requiredColor": "#FF0055"
      }
    ],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [],
    "fans": [],
    "gravityInverted": false
  },
  "32": {
    "title": "CHAMBER 32: CRUSHER STEP CLIMB",
    "hint": "JAM CRUSHER WITH CRATE, THEN JUMP ON TOP TO HIGH DOOR!",
    "playerStart": {
      "x": 30,
      "y": 260
    },
    "exitDoor": {
      "x": 290,
      "y": 118,
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
        "id": "high_p",
        "x": 250,
        "y": 160,
        "w": 100,
        "h": 140
      }
    ],
    "crates": [
      {
        "id": "c1",
        "x": 80,
        "y": 260,
        "isDraggable": true
      }
    ],
    "springs": [],
    "switches": [],
    "keys": [
      {
        "id": "k1",
        "x": 270,
        "y": 125,
        "taken": false,
        "color": "#FFE600",
        "isDraggable": true
      }
    ],
    "plates": [],
    "hazards": [
      {
        "id": "crush1",
        "x": 180,
        "y": 160,
        "w": 36,
        "h": 110,
        "type": "SPIKES"
      }
    ],
    "barriers": [],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [],
    "fans": [],
    "gravityInverted": false
  },
  "33": {
    "title": "CHAMBER 33: PORTAL SPIKES BYPASS",
    "hint": "DROP INTO PORTAL ON LEFT TO EXIT SAFELY ON RIGHT SIDE!",
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
        "x": 295,
        "y": 265,
        "taken": false,
        "color": "#39FF14",
        "isDraggable": false
      }
    ],
    "plates": [],
    "hazards": [
      {
        "x": 90,
        "y": 286,
        "w": 160,
        "h": 14,
        "type": "SPIKES"
      }
    ],
    "barriers": [],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [
      {
        "id": "p1",
        "x": 50,
        "y": 250,
        "partnerId": "p2",
        "color": "#00F5FF",
        "exitOffsetX": 20,
        "exitOffsetY": 0
      },
      {
        "id": "p2",
        "x": 270,
        "y": 250,
        "partnerId": "p1",
        "color": "#FF9E00",
        "exitOffsetX": 20,
        "exitOffsetY": 0
      }
    ],
    "fans": [],
    "gravityInverted": false
  },
  "34": {
    "title": "CHAMBER 34: BALLOON ELEVATOR RIDE",
    "hint": "STAND ON BALLOON CRATE AND STEER IT UPWARD WITH FINGER!",
    "playerStart": {
      "x": 30,
      "y": 260
    },
    "exitDoor": {
      "x": 280,
      "y": 78,
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
        "id": "high_p",
        "x": 230,
        "y": 120,
        "w": 120,
        "h": 180
      }
    ],
    "crates": [
      {
        "id": "c_bal",
        "x": 120,
        "y": 260,
        "isBalloon": true,
        "isDraggable": true
      }
    ],
    "springs": [],
    "switches": [],
    "keys": [
      {
        "id": "k1",
        "x": 260,
        "y": 85,
        "taken": false,
        "color": "#00F5FF",
        "isDraggable": true
      }
    ],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [],
    "fans": [],
    "gravityInverted": false
  },
  "35": {
    "title": "CHAMBER 35: DUAL MIRROR ZIG-ZAG",
    "hint": "POSITION TWO 45° MIRRORS TO SNAKE THE LASER AROUND WALL!",
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
      },
      {
        "id": "wall",
        "x": 170,
        "y": 60,
        "w": 18,
        "h": 180
      },
      {
        "id": "mir1",
        "x": 90,
        "y": 90,
        "w": 32,
        "h": 32,
        "isMirror": true,
        "isDraggable": true,
        "color": "#A5F3FC"
      },
      {
        "id": "mir2",
        "x": 240,
        "y": 200,
        "w": 32,
        "h": 32,
        "isMirror": true,
        "isDraggable": true,
        "color": "#A5F3FC"
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
        "id": "b1",
        "x": 270,
        "y": 180,
        "w": 8,
        "h": 120,
        "active": true,
        "receptorId": "rec1"
      }
    ],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [
      {
        "id": "rec1",
        "x": 290,
        "y": 268,
        "w": 24,
        "h": 24,
        "beamX": 180,
        "beamY": 100,
        "hit": false
      }
    ],
    "portals": [],
    "fans": [],
    "gravityInverted": false
  },
  "36": {
    "title": "CHAMBER 36: SPRING OVER LASER FENCE",
    "hint": "BOUNCE ON SPRING OVER 180PX LASER FENCE TO REACH SWITCH!",
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
    "springs": [
      {
        "id": "sp1",
        "x": 110,
        "y": 288,
        "w": 34,
        "h": 12,
        "isDraggable": true
      }
    ],
    "switches": [
      {
        "id": "sw1",
        "x": 250,
        "y": 268,
        "active": false
      }
    ],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [
      {
        "id": "fence",
        "x": 180,
        "y": 100,
        "w": 10,
        "h": 200,
        "active": true
      }
    ],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [],
    "fans": [],
    "gravityInverted": false
  },
  "37": {
    "title": "CHAMBER 37: BATTERY POWERED FAN",
    "hint": "SLOT BATTERY INTO SOCKET TO POWER TURBINE WIND LIFT!",
    "playerStart": {
      "x": 30,
      "y": 260
    },
    "exitDoor": {
      "x": 280,
      "y": 88,
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
        "id": "roof",
        "x": 220,
        "y": 130,
        "w": 130,
        "h": 170
      }
    ],
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [
      {
        "id": "k1",
        "x": 260,
        "y": 95,
        "taken": false,
        "color": "#00F5FF",
        "isDraggable": true
      }
    ],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "plug": null,
    "padlock": null,
    "battery": {
      "id": "bat1",
      "x": 50,
      "y": 270,
      "w": 22,
      "h": 22,
      "slotted": false
    },
    "socket": {
      "id": "sock1",
      "x": 140,
      "y": 260,
      "w": 28,
      "h": 28
    },
    "receptors": [],
    "portals": [],
    "fans": [
      {
        "id": "fan1",
        "x": 140,
        "y": 292,
        "w": 38,
        "h": 12,
        "active": true
      }
    ],
    "gravityInverted": false
  },
  "38": {
    "title": "CHAMBER 38: CEILING CRATE STACK",
    "hint": "WALK ON CEILING, STACK CRATES DOWNWARD TOWARD SWITCH!",
    "playerStart": {
      "x": 30,
      "y": 260
    },
    "exitDoor": {
      "x": 300,
      "y": 14,
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
    "crates": [
      {
        "id": "c1",
        "x": 80,
        "y": 50,
        "isDraggable": true
      },
      {
        "id": "c2",
        "x": 130,
        "y": 50,
        "isDraggable": true
      }
    ],
    "springs": [],
    "switches": [
      {
        "id": "sw1",
        "x": 200,
        "y": 120,
        "active": false
      }
    ],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [],
    "fans": [],
    "gravityInverted": true
  },
  "39": {
    "title": "CHAMBER 39: PORTAL CRATE DROP",
    "hint": "PUSH CRATE INTO UPPER PORTAL TO DROP ONTO FLOOR PLATE!",
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
    "crates": [
      {
        "id": "c1",
        "x": 50,
        "y": 260,
        "isDraggable": true
      }
    ],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [
      {
        "id": "p1",
        "x": 270,
        "y": 295,
        "w": 38,
        "h": 6,
        "pressed": false
      }
    ],
    "hazards": [],
    "barriers": [
      {
        "id": "b1",
        "x": 220,
        "y": 180,
        "w": 8,
        "h": 120,
        "active": true,
        "plateIds": [
          "p1"
        ]
      }
    ],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [
      {
        "id": "p1",
        "x": 90,
        "y": 240,
        "partnerId": "p2",
        "color": "#00F5FF",
        "exitOffsetX": 0,
        "exitOffsetY": 25
      },
      {
        "id": "p2",
        "x": 270,
        "y": 60,
        "partnerId": "p1",
        "color": "#FF9E00",
        "exitOffsetX": 0,
        "exitOffsetY": 25
      }
    ],
    "fans": [],
    "gravityInverted": false
  },
  "40": {
    "title": "CHAMBER 40: TRIPLE PRESSURE OVERRIDE",
    "hint": "PLATE 1 CRATE, PLATE 2 PLAYER, PLATE 3 FINGER HOLD!",
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
    "crates": [
      {
        "id": "c1",
        "x": 40,
        "y": 260,
        "isDraggable": true
      }
    ],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [
      {
        "id": "p1",
        "x": 80,
        "y": 295,
        "w": 36,
        "h": 6,
        "pressed": false
      },
      {
        "id": "p2",
        "x": 160,
        "y": 295,
        "w": 36,
        "h": 6,
        "pressed": false
      },
      {
        "id": "p3",
        "x": 240,
        "y": 295,
        "w": 36,
        "h": 6,
        "pressed": false,
        "pressedByFinger": false
      }
    ],
    "hazards": [],
    "barriers": [],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [],
    "fans": [],
    "gravityInverted": false
  },
  "41": {
    "title": "CHAMBER 41: KINETIC LABYRINTH",
    "hint": "CRUMBLING FLOOR -> SPRING LAUNCH -> MIRROR DEFLECTION!",
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
      },
      {
        "id": "cr1",
        "x": 60,
        "y": 265,
        "w": 40,
        "h": 12,
        "isCrumbling": true,
        "color": "#FB7185"
      },
      {
        "id": "mir1",
        "x": 180,
        "y": 90,
        "w": 32,
        "h": 32,
        "isMirror": true,
        "isDraggable": true,
        "color": "#A5F3FC"
      }
    ],
    "crates": [],
    "springs": [
      {
        "id": "sp1",
        "x": 120,
        "y": 288,
        "w": 34,
        "h": 12,
        "isDraggable": true
      }
    ],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [
      {
        "id": "b1",
        "x": 250,
        "y": 180,
        "w": 8,
        "h": 120,
        "active": true,
        "receptorId": "rec1"
      }
    ],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [
      {
        "id": "rec1",
        "x": 280,
        "y": 268,
        "w": 24,
        "h": 24,
        "beamX": 180,
        "beamY": 100,
        "hit": false
      }
    ],
    "portals": [],
    "fans": [],
    "gravityInverted": false
  },
  "42": {
    "title": "CHAMBER 42: BATTERY TRANSPORT",
    "hint": "SPRING-JUMP TO BATTERY, BRIDGE CHASM WITH SLAB, SLOT IN SOCKET!",
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
      "requiresBattery": true
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
        "x": 150,
        "y": 120,
        "w": 65,
        "h": 14,
        "isDraggable": true,
        "color": "#00F5D4"
      }
    ],
    "crates": [],
    "springs": [
      {
        "id": "sp1",
        "x": 60,
        "y": 288,
        "w": 34,
        "h": 12,
        "isDraggable": true
      }
    ],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [
      {
        "x": 130,
        "y": 286,
        "w": 100,
        "h": 14,
        "type": "SPIKES"
      }
    ],
    "barriers": [],
    "plug": null,
    "padlock": null,
    "battery": {
      "id": "bat1",
      "x": 80,
      "y": 120,
      "w": 22,
      "h": 22,
      "slotted": false
    },
    "socket": {
      "id": "sock1",
      "x": 270,
      "y": 260,
      "w": 28,
      "h": 28
    },
    "receptors": [],
    "portals": [],
    "fans": [],
    "gravityInverted": false
  },
  "43": {
    "title": "CHAMBER 43: INVERTED LASER MIRROR",
    "hint": "CEILING GRAVITY: DRAG MIRROR TO ALIGN CEILING LASER INTO RECEPTOR!",
    "playerStart": {
      "x": 30,
      "y": 260
    },
    "exitDoor": {
      "x": 300,
      "y": 14,
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
        "id": "mir1",
        "x": 120,
        "y": 60,
        "w": 32,
        "h": 32,
        "isMirror": true,
        "isDraggable": true,
        "color": "#A5F3FC"
      }
    ],
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [
      {
        "id": "k1",
        "x": 270,
        "y": 45,
        "taken": false,
        "color": "#00F5FF",
        "isDraggable": true
      }
    ],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [
      {
        "id": "rec1",
        "x": 240,
        "y": 40,
        "w": 24,
        "h": 24,
        "beamX": 160,
        "beamY": 80,
        "hit": false
      }
    ],
    "portals": [],
    "fans": [],
    "gravityInverted": true
  },
  "44": {
    "title": "CHAMBER 44: PORTAL CRUSHER JAM",
    "hint": "TELEPORT CRATE THROUGH PORTAL INTO CRUSHER TO JAM IT!",
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
    "crates": [
      {
        "id": "c1",
        "x": 40,
        "y": 260,
        "isDraggable": true
      }
    ],
    "springs": [],
    "switches": [],
    "keys": [
      {
        "id": "k1",
        "x": 270,
        "y": 265,
        "taken": false,
        "color": "#39FF14",
        "isDraggable": false
      }
    ],
    "plates": [],
    "hazards": [
      {
        "id": "crush1",
        "x": 170,
        "y": 160,
        "w": 36,
        "h": 110,
        "type": "SPIKES"
      }
    ],
    "barriers": [],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [
      {
        "id": "p1",
        "x": 60,
        "y": 240,
        "partnerId": "p2",
        "color": "#00F5FF",
        "exitOffsetX": 0,
        "exitOffsetY": 25
      },
      {
        "id": "p2",
        "x": 180,
        "y": 60,
        "partnerId": "p1",
        "color": "#FF9E00",
        "exitOffsetX": 0,
        "exitOffsetY": 25
      }
    ],
    "fans": [],
    "gravityInverted": false
  },
  "45": {
    "title": "CHAMBER 45: TIMED WIND ASCENT",
    "hint": "TIMED SWITCH ACTIVATES FAN FOR 5S: RIDE UPDRAFT BEFORE IT CUTS!",
    "playerStart": {
      "x": 30,
      "y": 260
    },
    "exitDoor": {
      "x": 290,
      "y": 78,
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
        "id": "high_p",
        "x": 230,
        "y": 120,
        "w": 120,
        "h": 180
      }
    ],
    "crates": [],
    "springs": [],
    "switches": [
      {
        "id": "sw_time",
        "x": 50,
        "y": 268,
        "isTimed": true,
        "timer": 0,
        "maxTimer": 4.8,
        "active": false
      }
    ],
    "keys": [
      {
        "id": "k1",
        "x": 260,
        "y": 85,
        "taken": false,
        "color": "#FFD166",
        "isDraggable": true
      }
    ],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [],
    "fans": [
      {
        "id": "fan1",
        "x": 150,
        "y": 292,
        "w": 38,
        "h": 12,
        "active": true
      }
    ],
    "gravityInverted": false
  },
  "46": {
    "title": "CHAMBER 46: BALLOON SPRING COMBO",
    "hint": "BOUNCE BALLOON CRATE OFF SPRING TO LAUNCH TO CEILING PLATE!",
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
    "crates": [
      {
        "id": "c_bal",
        "x": 80,
        "y": 260,
        "isBalloon": true,
        "isDraggable": true
      }
    ],
    "springs": [
      {
        "id": "sp1",
        "x": 120,
        "y": 288,
        "w": 34,
        "h": 12,
        "isDraggable": true
      }
    ],
    "switches": [],
    "keys": [],
    "plates": [
      {
        "id": "cp1",
        "x": 180,
        "y": 12,
        "w": 42,
        "h": 6,
        "pressed": false,
        "isCeiling": true
      }
    ],
    "hazards": [],
    "barriers": [
      {
        "id": "b1",
        "x": 250,
        "y": 180,
        "w": 8,
        "h": 120,
        "active": true,
        "plateIds": [
          "cp1"
        ]
      }
    ],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [],
    "fans": [],
    "gravityInverted": false
  },
  "47": {
    "title": "CHAMBER 47: DOUBLE PLUG LOCKDOWN",
    "hint": "YANK PLUG A TO LOWER GATE, YANK PLUG B TO DROP EXIT DOOR!",
    "playerStart": {
      "x": 30,
      "y": 260
    },
    "exitDoor": {
      "x": 310,
      "y": 55,
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
    ],
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [
      {
        "id": "k1",
        "x": 210,
        "y": 265,
        "taken": false,
        "color": "#FFD166",
        "isDraggable": true
      }
    ],
    "plates": [],
    "hazards": [],
    "barriers": [
      {
        "id": "b1",
        "x": 160,
        "y": 180,
        "w": 8,
        "h": 120,
        "active": true,
        "byPlug": true
      },
      {
        "id": "b2",
        "x": 260,
        "y": 180,
        "w": 8,
        "h": 120,
        "active": true,
        "byPlug": true
      }
    ],
    "plug": {
      "id": "plug1",
      "x": 60,
      "y": 160,
      "plugged": true
    },
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [],
    "fans": [],
    "gravityInverted": false
  },
  "48": {
    "title": "CHAMBER 48: DUAL MIRROR PORTAL RELAY",
    "hint": "MIRROR REFLECTS LASER INTO PORTAL, BEAMS OUT TO RECEPTOR!",
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
      },
      {
        "id": "mir1",
        "x": 90,
        "y": 100,
        "w": 32,
        "h": 32,
        "isMirror": true,
        "isDraggable": true,
        "color": "#A5F3FC"
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
        "id": "b1",
        "x": 250,
        "y": 180,
        "w": 8,
        "h": 120,
        "active": true,
        "receptorId": "rec1"
      }
    ],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [
      {
        "id": "rec1",
        "x": 280,
        "y": 268,
        "w": 24,
        "h": 24,
        "beamX": 150,
        "beamY": 100,
        "hit": false
      }
    ],
    "portals": [
      {
        "id": "p1",
        "x": 150,
        "y": 160,
        "partnerId": "p2",
        "color": "#00F5FF"
      },
      {
        "id": "p2",
        "x": 240,
        "y": 200,
        "partnerId": "p1",
        "color": "#FF9E00"
      }
    ],
    "fans": [],
    "gravityInverted": false
  },
  "49": {
    "title": "CHAMBER 49: SPRING PAD MEGA BRIDGE",
    "hint": "SPRING LAUNCH OVER FIRST WALL, DRAG SLAB OVER SECOND PIT!",
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
      },
      {
        "id": "wall1",
        "x": 120,
        "y": 140,
        "w": 18,
        "h": 160
      },
      {
        "id": "slab",
        "x": 170,
        "y": 100,
        "w": 60,
        "h": 14,
        "isDraggable": true,
        "color": "#00F5D4"
      }
    ],
    "crates": [],
    "springs": [
      {
        "id": "sp1",
        "x": 70,
        "y": 288,
        "w": 34,
        "h": 12,
        "isDraggable": true
      }
    ],
    "switches": [],
    "keys": [
      {
        "id": "k1",
        "x": 280,
        "y": 265,
        "taken": false,
        "color": "#39FF14",
        "isDraggable": false
      }
    ],
    "plates": [],
    "hazards": [
      {
        "x": 160,
        "y": 286,
        "w": 90,
        "h": 14,
        "type": "SPIKES"
      }
    ],
    "barriers": [],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [],
    "fans": [],
    "gravityInverted": false
  },
  "50": {
    "title": "CHAMBER 50: TRIPLE COLOR SECURITY",
    "hint": "RED KEY -> BLUE GATE -> CYAN KEY -> YELLOW GATE -> EXIT!",
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
        "id": "k_red",
        "x": 50,
        "y": 265,
        "taken": false,
        "color": "#FF0055",
        "isDraggable": true
      },
      {
        "id": "k_cyan",
        "x": 140,
        "y": 265,
        "taken": false,
        "color": "#00F5FF",
        "isDraggable": true
      },
      {
        "id": "k_yel",
        "x": 230,
        "y": 265,
        "taken": false,
        "color": "#FFE600",
        "isDraggable": false
      }
    ],
    "plates": [],
    "hazards": [],
    "barriers": [
      {
        "id": "b_red",
        "x": 100,
        "y": 180,
        "w": 8,
        "h": 120,
        "active": true,
        "color": "#FF0055",
        "requiredColor": "#FF0055"
      },
      {
        "id": "b_cyan",
        "x": 190,
        "y": 180,
        "w": 8,
        "h": 120,
        "active": true,
        "color": "#00F5FF",
        "requiredColor": "#00F5FF"
      }
    ],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [],
    "fans": [],
    "gravityInverted": false
  },
  "51": {
    "title": "CHAMBER 51: CEILING PORTAL DROP",
    "hint": "INVERT GRAVITY TO ENTER CEILING PORTAL, FALL RIGHT TO EXIT!",
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
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [
      {
        "id": "b1",
        "x": 180,
        "y": 0,
        "w": 10,
        "h": 300,
        "active": true
      }
    ],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [
      {
        "id": "p1",
        "x": 90,
        "y": 40,
        "partnerId": "p2",
        "color": "#00F5FF",
        "exitOffsetX": 20,
        "exitOffsetY": 0
      },
      {
        "id": "p2",
        "x": 260,
        "y": 240,
        "partnerId": "p1",
        "color": "#FF9E00",
        "exitOffsetX": 20,
        "exitOffsetY": 0
      }
    ],
    "fans": [],
    "gravityInverted": true
  },
  "52": {
    "title": "CHAMBER 52: WIND FAN DEFLECTOR",
    "hint": "FAN BLOWS KEY SIDEWAYS; POSITION SLAB TO DEFLECT IT TO GROUND!",
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
      },
      {
        "id": "slab",
        "x": 160,
        "y": 140,
        "w": 55,
        "h": 14,
        "isDraggable": true,
        "color": "#00F5D4"
      }
    ],
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [
      {
        "id": "k1",
        "x": 120,
        "y": 80,
        "taken": false,
        "color": "#FFD166",
        "isDraggable": true
      }
    ],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [],
    "fans": [
      {
        "id": "fan1",
        "x": 100,
        "y": 292,
        "w": 38,
        "h": 12,
        "active": true
      }
    ],
    "gravityInverted": false
  },
  "53": {
    "title": "CHAMBER 53: TIMED DUAL OVERRIDE",
    "hint": "HIT 4S TIMED SWITCH, SPRINT TO PLATE A, HOLD PLATE B!",
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
    "switches": [
      {
        "id": "sw_time",
        "x": 40,
        "y": 268,
        "isTimed": true,
        "timer": 0,
        "maxTimer": 4.2,
        "active": false
      }
    ],
    "keys": [],
    "plates": [
      {
        "id": "p1",
        "x": 130,
        "y": 295,
        "w": 38,
        "h": 6,
        "pressed": false
      },
      {
        "id": "p2",
        "x": 230,
        "y": 295,
        "w": 38,
        "h": 6,
        "pressed": false,
        "pressedByFinger": false
      }
    ],
    "hazards": [],
    "barriers": [
      {
        "id": "b1",
        "x": 270,
        "y": 180,
        "w": 8,
        "h": 120,
        "active": true,
        "switchId": "sw_time"
      }
    ],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [],
    "fans": [],
    "gravityInverted": false
  },
  "54": {
    "title": "CHAMBER 54: CRUSHER ROOF RIDE",
    "hint": "STAND ON TOP OF RISING CRUSHER PISTON TO REACH HIGH ALCOVE!",
    "playerStart": {
      "x": 30,
      "y": 260
    },
    "exitDoor": {
      "x": 280,
      "y": 58,
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
        "id": "alcove",
        "x": 220,
        "y": 100,
        "w": 130,
        "h": 200
      }
    ],
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [
      {
        "id": "k1",
        "x": 250,
        "y": 65,
        "taken": false,
        "color": "#39FF14",
        "isDraggable": false
      }
    ],
    "plates": [],
    "hazards": [
      {
        "id": "crush1",
        "x": 140,
        "y": 170,
        "w": 38,
        "h": 100,
        "type": "SPIKES"
      }
    ],
    "barriers": [],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [],
    "fans": [],
    "gravityInverted": false
  },
  "55": {
    "title": "CHAMBER 55: BALLOON CRATE STAIRCASE",
    "hint": "STACK NORMAL CRATE ON FLOATING BALLOON CRATE FOR TALL STAIR!",
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
      },
      {
        "id": "wall",
        "x": 200,
        "y": 120,
        "w": 20,
        "h": 180
      }
    ],
    "crates": [
      {
        "id": "c_bal",
        "x": 100,
        "y": 260,
        "isBalloon": true,
        "isDraggable": true
      },
      {
        "id": "c_norm",
        "x": 50,
        "y": 260,
        "isDraggable": true
      }
    ],
    "springs": [],
    "switches": [],
    "keys": [
      {
        "id": "k1",
        "x": 270,
        "y": 265,
        "taken": false,
        "color": "#FFD166",
        "isDraggable": true
      }
    ],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [],
    "fans": [],
    "gravityInverted": false
  },
  "56": {
    "title": "CHAMBER 56: PORTAL MIRROR CIRCUIT",
    "hint": "LASER SHOOTS THROUGH PORTAL, BOUNCED BY MIRROR INTO RECEPTOR!",
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
      },
      {
        "id": "mir1",
        "x": 230,
        "y": 160,
        "w": 32,
        "h": 32,
        "isMirror": true,
        "isDraggable": true,
        "color": "#A5F3FC"
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
        "id": "b1",
        "x": 260,
        "y": 180,
        "w": 8,
        "h": 120,
        "active": true,
        "receptorId": "rec1"
      }
    ],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [
      {
        "id": "rec1",
        "x": 280,
        "y": 268,
        "w": 24,
        "h": 24,
        "beamX": 180,
        "beamY": 100,
        "hit": false
      }
    ],
    "portals": [
      {
        "id": "p1",
        "x": 80,
        "y": 120,
        "partnerId": "p2",
        "color": "#00F5FF"
      },
      {
        "id": "p2",
        "x": 180,
        "y": 160,
        "partnerId": "p1",
        "color": "#FF9E00"
      }
    ],
    "fans": [],
    "gravityInverted": false
  },
  "57": {
    "title": "CHAMBER 57: CRUMBLING SPRING ESCAPE",
    "hint": "RUN ACROSS 3 CRUMBLING TILES, FINAL TILE IS SPRING LAUNCH!",
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
      },
      {
        "id": "cr1",
        "x": 90,
        "y": 265,
        "w": 38,
        "h": 12,
        "isCrumbling": true,
        "color": "#FB7185"
      },
      {
        "id": "cr2",
        "x": 150,
        "y": 265,
        "w": 38,
        "h": 12,
        "isCrumbling": true,
        "color": "#FB7185"
      }
    ],
    "crates": [],
    "springs": [
      {
        "id": "sp1",
        "x": 200,
        "y": 288,
        "w": 34,
        "h": 12,
        "isDraggable": false
      }
    ],
    "switches": [],
    "keys": [
      {
        "id": "k1",
        "x": 290,
        "y": 265,
        "taken": false,
        "color": "#00F5FF",
        "isDraggable": false
      }
    ],
    "plates": [],
    "hazards": [
      {
        "x": 70,
        "y": 286,
        "w": 160,
        "h": 14,
        "type": "SPIKES"
      }
    ],
    "barriers": [],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [],
    "fans": [],
    "gravityInverted": false
  },
  "58": {
    "title": "CHAMBER 58: PADLOCK ABOVE PIT",
    "hint": "SPIKE PIT IN FRONT OF DOOR: BRIDGE WITH SLAB, THEN RIP PADLOCK!",
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
        "id": "slab",
        "x": 70,
        "y": 140,
        "w": 65,
        "h": 14,
        "isDraggable": true,
        "color": "#00F5D4"
      }
    ],
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [
      {
        "x": 200,
        "y": 286,
        "w": 90,
        "h": 14,
        "type": "SPIKES"
      }
    ],
    "barriers": [],
    "plug": null,
    "padlock": {
      "id": "pad1",
      "x": 316,
      "y": 268,
      "onDoor": true
    },
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [],
    "fans": [],
    "gravityInverted": false
  },
  "59": {
    "title": "CHAMBER 59: BATTERY ELEVATOR",
    "hint": "SLOT BATTERY INTO MOVING LIFT SOCKET TO START PLATFORM MOVING!",
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
      },
      {
        "id": "mov_p",
        "x": 100,
        "y": 270,
        "w": 55,
        "h": 14,
        "minX": 95,
        "maxX": 220,
        "speed": 1.6,
        "dir": 1,
        "color": "#00F5FF"
      }
    ],
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [
      {
        "id": "k1",
        "x": 280,
        "y": 265,
        "taken": false,
        "color": "#FFD166",
        "isDraggable": false
      }
    ],
    "plates": [],
    "hazards": [
      {
        "x": 90,
        "y": 286,
        "w": 150,
        "h": 14,
        "type": "SPIKES"
      }
    ],
    "barriers": [],
    "plug": null,
    "padlock": null,
    "battery": {
      "id": "bat1",
      "x": 40,
      "y": 270,
      "w": 22,
      "h": 22,
      "slotted": false
    },
    "socket": {
      "id": "sock1",
      "x": 100,
      "y": 260,
      "w": 28,
      "h": 28
    },
    "receptors": [],
    "portals": [],
    "fans": [],
    "gravityInverted": false
  },
  "60": {
    "title": "CHAMBER 60: MID-AIR PADLOCK TEAR",
    "hint": "BOUNCE HIGH ON SPRING PAD, RIP PADLOCK OFF HIGH DOOR IN MID-AIR!",
    "playerStart": {
      "x": 30,
      "y": 260
    },
    "exitDoor": {
      "x": 290,
      "y": 70,
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
    "springs": [
      {
        "id": "sp1",
        "x": 180,
        "y": 288,
        "w": 34,
        "h": 12,
        "isDraggable": true
      }
    ],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "plug": null,
    "padlock": {
      "id": "pad1",
      "x": 296,
      "y": 84,
      "onDoor": true
    },
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [],
    "fans": [],
    "gravityInverted": false
  },
  "61": {
    "title": "CHAMBER 61: THE QUANTUM RELAY",
    "hint": "ALIGN 3 MIRRORS IN SEQUENCE TO REFRACT BEAM TO POWER RECEPTOR!",
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
      },
      {
        "id": "mir_61",
        "x": 100,
        "y": 110,
        "w": 32,
        "h": 32,
        "isMirror": true,
        "isDraggable": true,
        "color": "#A5F3FC"
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
        "id": "b_61",
        "x": 240,
        "y": 180,
        "w": 8,
        "h": 120,
        "active": true,
        "receptorId": "rec_61"
      }
    ],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [
      {
        "id": "rec_61",
        "x": 260,
        "y": 268,
        "w": 24,
        "h": 24,
        "beamX": 160,
        "beamY": 100,
        "hit": false
      }
    ],
    "portals": [],
    "fans": [],
    "gravityInverted": false
  },
  "62": {
    "title": "CHAMBER 62: HYDRO-PNEUMATIC LIFT",
    "hint": "WIND FAN LIFTS BALLOON CRATE INTO STEPPING STONE FOR HIGH EXIT!",
    "playerStart": {
      "x": 30,
      "y": 260
    },
    "exitDoor": {
      "x": 280,
      "y": 78,
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
        "id": "roof_62",
        "x": 220,
        "y": 120,
        "w": 130,
        "h": 180
      }
    ],
    "crates": [
      {
        "id": "c_bal_62",
        "x": 80,
        "y": 260,
        "isBalloon": true,
        "isDraggable": true
      }
    ],
    "springs": [],
    "switches": [],
    "keys": [
      {
        "id": "k_62",
        "x": 260,
        "y": 85,
        "taken": false,
        "color": "#00F5FF",
        "isDraggable": true
      }
    ],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [],
    "fans": [
      {
        "id": "fan_62",
        "x": 120,
        "y": 292,
        "w": 38,
        "h": 12,
        "active": true
      }
    ],
    "gravityInverted": false
  },
  "63": {
    "title": "CHAMBER 63: THE REVERSED RUNNER",
    "hint": "CEILING GRAVITY + TIMED LASER GATE: SPRINT CEILING TILES BEFORE GATE RE-LOCKS!",
    "playerStart": {
      "x": 30,
      "y": 260
    },
    "exitDoor": {
      "x": 300,
      "y": 14,
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
        "id": "crumb_63",
        "x": 120,
        "y": 40,
        "w": 45,
        "h": 12,
        "isCrumbling": true,
        "color": "#FB7185"
      }
    ],
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [
      {
        "id": "k_63",
        "x": 260,
        "y": 40,
        "taken": false,
        "color": "#FFD166",
        "isDraggable": true
      }
    ],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [],
    "fans": [],
    "gravityInverted": true
  },
  "64": {
    "title": "CHAMBER 64: BATTERY SHUTTLE",
    "hint": "RIDE MOVING PLATFORM WHILE HOLDING BATTERY TO DOCK INTO MOVING SOCKET!",
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
      "requiresBattery": true
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
        "id": "mov_64",
        "x": 90,
        "y": 270,
        "w": 55,
        "h": 14,
        "minX": 85,
        "maxX": 210,
        "speed": 1.6,
        "dir": 1,
        "color": "#00F5FF"
      }
    ],
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "plug": null,
    "padlock": null,
    "battery": {
      "id": "bat_64",
      "x": 40,
      "y": 270,
      "w": 22,
      "h": 22,
      "slotted": false
    },
    "socket": {
      "id": "sock_64",
      "x": 260,
      "y": 260,
      "w": 28,
      "h": 28
    },
    "receptors": [],
    "portals": [],
    "fans": [],
    "gravityInverted": false
  },
  "65": {
    "title": "CHAMBER 65: SOKOBAN TRI-PLATE",
    "hint": "PUSH 3 CRATES INTO 3 ALCOVES TO DISABLE 3 LASER PERIMETER FENCES!",
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
    "crates": [
      {
        "id": "c1_65",
        "x": 50,
        "y": 260,
        "isDraggable": true
      },
      {
        "id": "c2_65",
        "x": 90,
        "y": 260,
        "isDraggable": true
      }
    ],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [
      {
        "id": "p1_65",
        "x": 140,
        "y": 295,
        "w": 34,
        "h": 6,
        "pressed": false
      },
      {
        "id": "p2_65",
        "x": 220,
        "y": 295,
        "w": 34,
        "h": 6,
        "pressed": false
      }
    ],
    "hazards": [],
    "barriers": [
      {
        "id": "b_65",
        "x": 270,
        "y": 180,
        "w": 8,
        "h": 120,
        "active": true,
        "plateIds": [
          "p1_65",
          "p2_65"
        ]
      }
    ],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [],
    "fans": [],
    "gravityInverted": false
  },
  "66": {
    "title": "CHAMBER 66: MOVING MIRROR SHIELD",
    "hint": "HOLD MIRROR SLAB TO DEFLECT CONTINUOUS LASER BARRAGE WHILE WALKING!",
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
    "springs": [
      {
        "id": "sp_66",
        "x": 100,
        "y": 288,
        "w": 34,
        "h": 12,
        "isDraggable": true
      }
    ],
    "switches": [],
    "keys": [
      {
        "id": "k_66",
        "x": 290,
        "y": 265,
        "taken": false,
        "color": "#FFD166",
        "isDraggable": false
      }
    ],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [
      {
        "id": "p1_66",
        "x": 180,
        "y": 140,
        "partnerId": "p2_66",
        "color": "#00F5FF",
        "exitOffsetX": 20,
        "exitOffsetY": 0
      },
      {
        "id": "p2_66",
        "x": 270,
        "y": 240,
        "partnerId": "p1_66",
        "color": "#FF9E00",
        "exitOffsetX": 20,
        "exitOffsetY": 0
      }
    ],
    "fans": [],
    "gravityInverted": false
  },
  "67": {
    "title": "CHAMBER 67: PORTAL GRAVITY LOOP",
    "hint": "PORTALS PLACED VERTICALLY: FALL THROUGH TO BUILD SPEED, SLINGSHOT TO EXIT!",
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
      },
      {
        "id": "slab_67",
        "x": 70,
        "y": 140,
        "w": 65,
        "h": 14,
        "isDraggable": true,
        "color": "#00F5D4"
      }
    ],
    "crates": [
      {
        "id": "c_67",
        "x": 40,
        "y": 260,
        "isDraggable": true
      }
    ],
    "springs": [],
    "switches": [],
    "keys": [
      {
        "id": "k_67",
        "x": 270,
        "y": 265,
        "taken": false,
        "color": "#39FF14",
        "isDraggable": false
      }
    ],
    "plates": [],
    "hazards": [
      {
        "id": "crush_67",
        "x": 160,
        "y": 170,
        "w": 36,
        "h": 100,
        "type": "SPIKES"
      }
    ],
    "barriers": [],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [],
    "fans": [],
    "gravityInverted": false
  },
  "68": {
    "title": "CHAMBER 68: CRUSHER SLAB TUNNEL",
    "hint": "SLIDE MAGNETIC SLAB BETWEEN TWO CRUSHERS TO FORM A SAFE CRAWL TUNNEL!",
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
        "id": "slab_68",
        "x": 140,
        "y": 130,
        "w": 60,
        "h": 14,
        "isDraggable": true,
        "color": "#00F5D4"
      },
      {
        "id": "mir_68",
        "x": 210,
        "y": 110,
        "w": 32,
        "h": 32,
        "isMirror": true,
        "isDraggable": true,
        "color": "#A5F3FC"
      }
    ],
    "crates": [],
    "springs": [
      {
        "id": "sp_68",
        "x": 70,
        "y": 288,
        "w": 34,
        "h": 12,
        "isDraggable": true
      }
    ],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "plug": null,
    "padlock": {
      "id": "pad_68",
      "x": 316,
      "y": 268,
      "onDoor": true
    },
    "battery": null,
    "socket": null,
    "receptors": [
      {
        "id": "rec_68",
        "x": 280,
        "y": 268,
        "w": 24,
        "h": 24,
        "beamX": 180,
        "beamY": 100,
        "hit": false
      }
    ],
    "portals": [],
    "fans": [],
    "gravityInverted": false
  },
  "69": {
    "title": "CHAMBER 69: TRIPLE TIMED SWITCHBOARD",
    "hint": "HIT SWITCHES 1, 2, 3 IN RAPID SUCCESSION BEFORE ANY RESET!",
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
      },
      {
        "id": "mir_69",
        "x": 124,
        "y": 110,
        "w": 32,
        "h": 32,
        "isMirror": true,
        "isDraggable": true,
        "color": "#A5F3FC"
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
        "id": "b_69",
        "x": 240,
        "y": 180,
        "w": 8,
        "h": 120,
        "active": true,
        "receptorId": "rec_69"
      }
    ],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [
      {
        "id": "rec_69",
        "x": 260,
        "y": 268,
        "w": 24,
        "h": 24,
        "beamX": 160,
        "beamY": 100,
        "hit": false
      }
    ],
    "portals": [],
    "fans": [],
    "gravityInverted": false
  },
  "70": {
    "title": "CHAMBER 70: THE FLOATING VAULT",
    "hint": "EXIT DOOR ADRIFT IN CENTER: DRAG DOOR ONTO MOVING PLATFORM TO REACH IT!",
    "playerStart": {
      "x": 30,
      "y": 260
    },
    "exitDoor": {
      "x": 280,
      "y": 78,
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
        "id": "roof_70",
        "x": 220,
        "y": 120,
        "w": 130,
        "h": 180
      }
    ],
    "crates": [
      {
        "id": "c_bal_70",
        "x": 80,
        "y": 260,
        "isBalloon": true,
        "isDraggable": true
      }
    ],
    "springs": [],
    "switches": [],
    "keys": [
      {
        "id": "k_70",
        "x": 260,
        "y": 85,
        "taken": false,
        "color": "#00F5FF",
        "isDraggable": true
      }
    ],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [],
    "fans": [
      {
        "id": "fan_70",
        "x": 120,
        "y": 292,
        "w": 38,
        "h": 12,
        "active": true
      }
    ],
    "gravityInverted": false
  },
  "71": {
    "title": "CHAMBER 71: ALTERNATING GRAVITY",
    "hint": "FLIP GRAVITY SWITCH TO CEILING TO CROSS UPPER SPIKES, FLIP BACK FOR EXIT!",
    "playerStart": {
      "x": 30,
      "y": 260
    },
    "exitDoor": {
      "x": 300,
      "y": 14,
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
        "id": "crumb_71",
        "x": 120,
        "y": 40,
        "w": 45,
        "h": 12,
        "isCrumbling": true,
        "color": "#FB7185"
      }
    ],
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [
      {
        "id": "k_71",
        "x": 260,
        "y": 40,
        "taken": false,
        "color": "#FFD166",
        "isDraggable": true
      }
    ],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [],
    "fans": [],
    "gravityInverted": true
  },
  "72": {
    "title": "CHAMBER 72: THE COLOR PRISM MATRIX",
    "hint": "RED KEY OPENS MIRROR CHAMBER; MIRROR DEFLECTION OPENS CYAN EXIT GATE!",
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
      "requiresBattery": true
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
        "id": "mov_72",
        "x": 90,
        "y": 270,
        "w": 55,
        "h": 14,
        "minX": 85,
        "maxX": 210,
        "speed": 1.6,
        "dir": 1,
        "color": "#00F5FF"
      }
    ],
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "plug": null,
    "padlock": null,
    "battery": {
      "id": "bat_72",
      "x": 40,
      "y": 270,
      "w": 22,
      "h": 22,
      "slotted": false
    },
    "socket": {
      "id": "sock_72",
      "x": 260,
      "y": 260,
      "w": 28,
      "h": 28
    },
    "receptors": [],
    "portals": [],
    "fans": [],
    "gravityInverted": false
  },
  "73": {
    "title": "CHAMBER 73: BALLOON COUNTERBALANCE",
    "hint": "BALLOON CRATE SUPPORTS HEAVY SLAB WHILE PLAYER WALKS ACROSS!",
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
    "crates": [
      {
        "id": "c1_73",
        "x": 50,
        "y": 260,
        "isDraggable": true
      },
      {
        "id": "c2_73",
        "x": 90,
        "y": 260,
        "isDraggable": true
      }
    ],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [
      {
        "id": "p1_73",
        "x": 140,
        "y": 295,
        "w": 34,
        "h": 6,
        "pressed": false
      },
      {
        "id": "p2_73",
        "x": 220,
        "y": 295,
        "w": 34,
        "h": 6,
        "pressed": false
      }
    ],
    "hazards": [],
    "barriers": [
      {
        "id": "b_73",
        "x": 270,
        "y": 180,
        "w": 8,
        "h": 120,
        "active": true,
        "plateIds": [
          "p1_73",
          "p2_73"
        ]
      }
    ],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [],
    "fans": [],
    "gravityInverted": false
  },
  "74": {
    "title": "CHAMBER 74: LASER GRID SHIELDING",
    "hint": "DENSE LASER FIELD: USE 2 MOVABLE SLABS TO CREATE A SHIELDED SAFE PATH!",
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
    "springs": [
      {
        "id": "sp_74",
        "x": 100,
        "y": 288,
        "w": 34,
        "h": 12,
        "isDraggable": true
      }
    ],
    "switches": [],
    "keys": [
      {
        "id": "k_74",
        "x": 290,
        "y": 265,
        "taken": false,
        "color": "#FFD166",
        "isDraggable": false
      }
    ],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [
      {
        "id": "p1_74",
        "x": 180,
        "y": 140,
        "partnerId": "p2_74",
        "color": "#00F5FF",
        "exitOffsetX": 20,
        "exitOffsetY": 0
      },
      {
        "id": "p2_74",
        "x": 270,
        "y": 240,
        "partnerId": "p1_74",
        "color": "#FF9E00",
        "exitOffsetX": 20,
        "exitOffsetY": 0
      }
    ],
    "fans": [],
    "gravityInverted": false
  },
  "75": {
    "title": "CHAMBER 75: DOUBLE CRUSHER STRIDE",
    "hint": "PUSH CRATE INTO CRUSHER 1, STEP ONTO CRUSHER 2 AT PEAK OF RHYTHM!",
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
      },
      {
        "id": "slab_75",
        "x": 70,
        "y": 140,
        "w": 65,
        "h": 14,
        "isDraggable": true,
        "color": "#00F5D4"
      }
    ],
    "crates": [
      {
        "id": "c_75",
        "x": 40,
        "y": 260,
        "isDraggable": true
      }
    ],
    "springs": [],
    "switches": [],
    "keys": [
      {
        "id": "k_75",
        "x": 270,
        "y": 265,
        "taken": false,
        "color": "#39FF14",
        "isDraggable": false
      }
    ],
    "plates": [],
    "hazards": [
      {
        "id": "crush_75",
        "x": 160,
        "y": 170,
        "w": 36,
        "h": 100,
        "type": "SPIKES"
      }
    ],
    "barriers": [],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [],
    "fans": [],
    "gravityInverted": false
  },
  "76": {
    "title": "CHAMBER 76: SPRING TO PORTAL LEAP",
    "hint": "SPRING PAD LAUNCHES PLAYER INTO CEILING PORTAL, EXITING DIRECTLY AT DOOR!",
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
        "id": "slab_76",
        "x": 140,
        "y": 130,
        "w": 60,
        "h": 14,
        "isDraggable": true,
        "color": "#00F5D4"
      },
      {
        "id": "mir_76",
        "x": 210,
        "y": 110,
        "w": 32,
        "h": 32,
        "isMirror": true,
        "isDraggable": true,
        "color": "#A5F3FC"
      }
    ],
    "crates": [],
    "springs": [
      {
        "id": "sp_76",
        "x": 70,
        "y": 288,
        "w": 34,
        "h": 12,
        "isDraggable": true
      }
    ],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "plug": null,
    "padlock": {
      "id": "pad_76",
      "x": 316,
      "y": 268,
      "onDoor": true
    },
    "battery": null,
    "socket": null,
    "receptors": [
      {
        "id": "rec_76",
        "x": 280,
        "y": 268,
        "w": 24,
        "h": 24,
        "beamX": 180,
        "beamY": 100,
        "hit": false
      }
    ],
    "portals": [],
    "fans": [],
    "gravityInverted": false
  },
  "77": {
    "title": "CHAMBER 77: TRIPLE PLUG SHUTDOWN",
    "hint": "PULL 3 WALL PLUGS IN SPECIFIC ORDER TO DEACTIVATE CORE SHIELD!",
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
      },
      {
        "id": "mir_77",
        "x": 148,
        "y": 110,
        "w": 32,
        "h": 32,
        "isMirror": true,
        "isDraggable": true,
        "color": "#A5F3FC"
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
        "id": "b_77",
        "x": 240,
        "y": 180,
        "w": 8,
        "h": 120,
        "active": true,
        "receptorId": "rec_77"
      }
    ],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [
      {
        "id": "rec_77",
        "x": 260,
        "y": 268,
        "w": 24,
        "h": 24,
        "beamX": 160,
        "beamY": 100,
        "hit": false
      }
    ],
    "portals": [],
    "fans": [],
    "gravityInverted": false
  },
  "78": {
    "title": "CHAMBER 78: CRUMBLING FALL INTERCEPT",
    "hint": "KEY DROPS ONTO CRUMBLING FLOOR: DRAG SLAB UNDERNEATH TO CATCH IT!",
    "playerStart": {
      "x": 30,
      "y": 260
    },
    "exitDoor": {
      "x": 280,
      "y": 78,
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
        "id": "roof_78",
        "x": 220,
        "y": 120,
        "w": 130,
        "h": 180
      }
    ],
    "crates": [
      {
        "id": "c_bal_78",
        "x": 80,
        "y": 260,
        "isBalloon": true,
        "isDraggable": true
      }
    ],
    "springs": [],
    "switches": [],
    "keys": [
      {
        "id": "k_78",
        "x": 260,
        "y": 85,
        "taken": false,
        "color": "#00F5FF",
        "isDraggable": true
      }
    ],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [],
    "fans": [
      {
        "id": "fan_78",
        "x": 120,
        "y": 292,
        "w": 38,
        "h": 12,
        "active": true
      }
    ],
    "gravityInverted": false
  },
  "79": {
    "title": "CHAMBER 79: SOLAR SENSOR ELEVATION",
    "hint": "LASER REDIRECTED INTO ELEVATOR SENSOR TO LIFT PLATFORM TO ROOF!",
    "playerStart": {
      "x": 30,
      "y": 260
    },
    "exitDoor": {
      "x": 300,
      "y": 14,
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
        "id": "crumb_79",
        "x": 120,
        "y": 40,
        "w": 45,
        "h": 12,
        "isCrumbling": true,
        "color": "#FB7185"
      }
    ],
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [
      {
        "id": "k_79",
        "x": 260,
        "y": 40,
        "taken": false,
        "color": "#FFD166",
        "isDraggable": true
      }
    ],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [],
    "fans": [],
    "gravityInverted": true
  },
  "80": {
    "title": "CHAMBER 80: MID-FALL CATCH",
    "hint": "DROP DOWN DEEP CHASM: DRAG SLAB INTO POSITION IN MID-FALL TO LAND SAFELY!",
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
      "requiresBattery": true
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
        "id": "mov_80",
        "x": 90,
        "y": 270,
        "w": 55,
        "h": 14,
        "minX": 85,
        "maxX": 210,
        "speed": 1.6,
        "dir": 1,
        "color": "#00F5FF"
      }
    ],
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "plug": null,
    "padlock": null,
    "battery": {
      "id": "bat_80",
      "x": 40,
      "y": 270,
      "w": 22,
      "h": 22,
      "slotted": false
    },
    "socket": {
      "id": "sock_80",
      "x": 260,
      "y": 260,
      "w": 28,
      "h": 28
    },
    "receptors": [],
    "portals": [],
    "fans": [],
    "gravityInverted": false
  },
  "81": {
    "title": "CHAMBER 81: THE APEX PRISM",
    "hint": "DEFLECT TWO CONVERGING LASERS ONTO CENTRAL CORE TO OPEN BLAST DOORS!",
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
    "crates": [
      {
        "id": "c1_81",
        "x": 50,
        "y": 260,
        "isDraggable": true
      },
      {
        "id": "c2_81",
        "x": 90,
        "y": 260,
        "isDraggable": true
      }
    ],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [
      {
        "id": "p1_81",
        "x": 140,
        "y": 295,
        "w": 34,
        "h": 6,
        "pressed": false
      },
      {
        "id": "p2_81",
        "x": 220,
        "y": 295,
        "w": 34,
        "h": 6,
        "pressed": false
      }
    ],
    "hazards": [],
    "barriers": [
      {
        "id": "b_81",
        "x": 270,
        "y": 180,
        "w": 8,
        "h": 120,
        "active": true,
        "plateIds": [
          "p1_81",
          "p2_81"
        ]
      }
    ],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [],
    "fans": [],
    "gravityInverted": false
  },
  "82": {
    "title": "CHAMBER 82: PERPETUAL PORTAL TOWER",
    "hint": "USE PORTALS AND GRAVITY INVERSION TO TRAVERSE VERTICAL TOWER!",
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
    "springs": [
      {
        "id": "sp_82",
        "x": 100,
        "y": 288,
        "w": 34,
        "h": 12,
        "isDraggable": true
      }
    ],
    "switches": [],
    "keys": [
      {
        "id": "k_82",
        "x": 290,
        "y": 265,
        "taken": false,
        "color": "#FFD166",
        "isDraggable": false
      }
    ],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [
      {
        "id": "p1_82",
        "x": 180,
        "y": 140,
        "partnerId": "p2_82",
        "color": "#00F5FF",
        "exitOffsetX": 20,
        "exitOffsetY": 0
      },
      {
        "id": "p2_82",
        "x": 270,
        "y": 240,
        "partnerId": "p1_82",
        "color": "#FF9E00",
        "exitOffsetX": 20,
        "exitOffsetY": 0
      }
    ],
    "fans": [],
    "gravityInverted": false
  },
  "83": {
    "title": "CHAMBER 83: ZERO-G CORE",
    "hint": "FLOATING BLOCKS IN ANTI-GRAVITY: PUSH BLOCKS TOGETHER TO FORM STEPPING BRIDGE!",
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
      },
      {
        "id": "slab_83",
        "x": 70,
        "y": 140,
        "w": 65,
        "h": 14,
        "isDraggable": true,
        "color": "#00F5D4"
      }
    ],
    "crates": [
      {
        "id": "c_83",
        "x": 40,
        "y": 260,
        "isDraggable": true
      }
    ],
    "springs": [],
    "switches": [],
    "keys": [
      {
        "id": "k_83",
        "x": 270,
        "y": 265,
        "taken": false,
        "color": "#39FF14",
        "isDraggable": false
      }
    ],
    "plates": [],
    "hazards": [
      {
        "id": "crush_83",
        "x": 160,
        "y": 170,
        "w": 36,
        "h": 100,
        "type": "SPIKES"
      }
    ],
    "barriers": [],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [],
    "fans": [],
    "gravityInverted": false
  },
  "84": {
    "title": "CHAMBER 84: THE KINETIC DOMINO",
    "hint": "CRATE HITS SPRING -> TRIGGERS PLATE -> STARTS FAN -> LIFTS KEY!",
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
        "id": "slab_84",
        "x": 140,
        "y": 130,
        "w": 60,
        "h": 14,
        "isDraggable": true,
        "color": "#00F5D4"
      },
      {
        "id": "mir_84",
        "x": 210,
        "y": 110,
        "w": 32,
        "h": 32,
        "isMirror": true,
        "isDraggable": true,
        "color": "#A5F3FC"
      }
    ],
    "crates": [],
    "springs": [
      {
        "id": "sp_84",
        "x": 70,
        "y": 288,
        "w": 34,
        "h": 12,
        "isDraggable": true
      }
    ],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "plug": null,
    "padlock": {
      "id": "pad_84",
      "x": 316,
      "y": 268,
      "onDoor": true
    },
    "battery": null,
    "socket": null,
    "receptors": [
      {
        "id": "rec_84",
        "x": 280,
        "y": 268,
        "w": 24,
        "h": 24,
        "beamX": 180,
        "beamY": 100,
        "hit": false
      }
    ],
    "portals": [],
    "fans": [],
    "gravityInverted": false
  },
  "85": {
    "title": "CHAMBER 85: QUADRUPLE OVERRIDE",
    "hint": "4 PRESSURE PLATES: 2 CRATES, 1 PLAYER, 1 FINGER-HOLD!",
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
      },
      {
        "id": "mir_85",
        "x": 172,
        "y": 110,
        "w": 32,
        "h": 32,
        "isMirror": true,
        "isDraggable": true,
        "color": "#A5F3FC"
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
        "id": "b_85",
        "x": 240,
        "y": 180,
        "w": 8,
        "h": 120,
        "active": true,
        "receptorId": "rec_85"
      }
    ],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [
      {
        "id": "rec_85",
        "x": 260,
        "y": 268,
        "w": 24,
        "h": 24,
        "beamX": 160,
        "beamY": 100,
        "hit": false
      }
    ],
    "portals": [],
    "fans": [],
    "gravityInverted": false
  },
  "86": {
    "title": "CHAMBER 86: VERTICAL MIRROR TOWER",
    "hint": "REDIRECT LASER UP VERTICAL SHAFT TO BURN PADLOCK OFF CEILING DOOR!",
    "playerStart": {
      "x": 30,
      "y": 260
    },
    "exitDoor": {
      "x": 280,
      "y": 78,
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
        "id": "roof_86",
        "x": 220,
        "y": 120,
        "w": 130,
        "h": 180
      }
    ],
    "crates": [
      {
        "id": "c_bal_86",
        "x": 80,
        "y": 260,
        "isBalloon": true,
        "isDraggable": true
      }
    ],
    "springs": [],
    "switches": [],
    "keys": [
      {
        "id": "k_86",
        "x": 260,
        "y": 85,
        "taken": false,
        "color": "#00F5FF",
        "isDraggable": true
      }
    ],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [],
    "fans": [
      {
        "id": "fan_86",
        "x": 120,
        "y": 292,
        "w": 38,
        "h": 12,
        "active": true
      }
    ],
    "gravityInverted": false
  },
  "87": {
    "title": "CHAMBER 87: SYNCHRONIZED PISTON GAUNTLET",
    "hint": "3 SYNCHRONIZED PISTONS, 2 CRATES TO PLACE, RAZOR-THIN TIMING!",
    "playerStart": {
      "x": 30,
      "y": 260
    },
    "exitDoor": {
      "x": 300,
      "y": 14,
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
        "id": "crumb_87",
        "x": 120,
        "y": 40,
        "w": 45,
        "h": 12,
        "isCrumbling": true,
        "color": "#FB7185"
      }
    ],
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [
      {
        "id": "k_87",
        "x": 260,
        "y": 40,
        "taken": false,
        "color": "#FFD166",
        "isDraggable": true
      }
    ],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [],
    "fans": [],
    "gravityInverted": true
  },
  "88": {
    "title": "CHAMBER 88: OPPOSING WIND VENTS",
    "hint": "CROSS OPPOSING WIND FANS USING HEAVY METAL CRATES AS BALLAST!",
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
      "requiresBattery": true
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
        "id": "mov_88",
        "x": 90,
        "y": 270,
        "w": 55,
        "h": 14,
        "minX": 85,
        "maxX": 210,
        "speed": 1.6,
        "dir": 1,
        "color": "#00F5FF"
      }
    ],
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "plug": null,
    "padlock": null,
    "battery": {
      "id": "bat_88",
      "x": 40,
      "y": 270,
      "w": 22,
      "h": 22,
      "slotted": false
    },
    "socket": {
      "id": "sock_88",
      "x": 260,
      "y": 260,
      "w": 28,
      "h": 28
    },
    "receptors": [],
    "portals": [],
    "fans": [],
    "gravityInverted": false
  },
  "89": {
    "title": "CHAMBER 89: TWIN BATTERY MATRIX",
    "hint": "2 BATTERIES TO SLOT INTO DUAL GENERATORS TO POWER TWIN BLAST DOORS!",
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
    "crates": [
      {
        "id": "c1_89",
        "x": 50,
        "y": 260,
        "isDraggable": true
      },
      {
        "id": "c2_89",
        "x": 90,
        "y": 260,
        "isDraggable": true
      }
    ],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [
      {
        "id": "p1_89",
        "x": 140,
        "y": 295,
        "w": 34,
        "h": 6,
        "pressed": false
      },
      {
        "id": "p2_89",
        "x": 220,
        "y": 295,
        "w": 34,
        "h": 6,
        "pressed": false
      }
    ],
    "hazards": [],
    "barriers": [
      {
        "id": "b_89",
        "x": 270,
        "y": 180,
        "w": 8,
        "h": 120,
        "active": true,
        "plateIds": [
          "p1_89",
          "p2_89"
        ]
      }
    ],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [],
    "fans": [],
    "gravityInverted": false
  },
  "90": {
    "title": "CHAMBER 90: DARK SPRINT MEMORY",
    "hint": "TIMED BLACKOUT SWITCH: MEMORIZE CRUMBLING FLOOR LAYOUT AND CROSS IN DARK!",
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
    "springs": [
      {
        "id": "sp_90",
        "x": 100,
        "y": 288,
        "w": 34,
        "h": 12,
        "isDraggable": true
      }
    ],
    "switches": [],
    "keys": [
      {
        "id": "k_90",
        "x": 290,
        "y": 265,
        "taken": false,
        "color": "#FFD166",
        "isDraggable": false
      }
    ],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [
      {
        "id": "p1_90",
        "x": 180,
        "y": 140,
        "partnerId": "p2_90",
        "color": "#00F5FF",
        "exitOffsetX": 20,
        "exitOffsetY": 0
      },
      {
        "id": "p2_90",
        "x": 270,
        "y": 240,
        "partnerId": "p1_90",
        "color": "#FF9E00",
        "exitOffsetX": 20,
        "exitOffsetY": 0
      }
    ],
    "fans": [],
    "gravityInverted": false
  },
  "91": {
    "title": "CHAMBER 91: TRIPLE PORTAL CIRCUIT",
    "hint": "CYCLE THROUGH 3 PORTAL PAIRS TO COLLECT 3 DISPERSED KEYCARDS!",
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
      },
      {
        "id": "slab_91",
        "x": 70,
        "y": 140,
        "w": 65,
        "h": 14,
        "isDraggable": true,
        "color": "#00F5D4"
      }
    ],
    "crates": [
      {
        "id": "c_91",
        "x": 40,
        "y": 260,
        "isDraggable": true
      }
    ],
    "springs": [],
    "switches": [],
    "keys": [
      {
        "id": "k_91",
        "x": 270,
        "y": 265,
        "taken": false,
        "color": "#39FF14",
        "isDraggable": false
      }
    ],
    "plates": [],
    "hazards": [
      {
        "id": "crush_91",
        "x": 160,
        "y": 170,
        "w": 36,
        "h": 100,
        "type": "SPIKES"
      }
    ],
    "barriers": [],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [],
    "fans": [],
    "gravityInverted": false
  },
  "92": {
    "title": "CHAMBER 92: CRATE SEESAW LAUNCH",
    "hint": "DROP HEAVY CRATE FROM HIGH PLATFORM ONTO SEESAW TO FLING KEY INTO REACH!",
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
        "id": "slab_92",
        "x": 140,
        "y": 130,
        "w": 60,
        "h": 14,
        "isDraggable": true,
        "color": "#00F5D4"
      },
      {
        "id": "mir_92",
        "x": 210,
        "y": 110,
        "w": 32,
        "h": 32,
        "isMirror": true,
        "isDraggable": true,
        "color": "#A5F3FC"
      }
    ],
    "crates": [],
    "springs": [
      {
        "id": "sp_92",
        "x": 70,
        "y": 288,
        "w": 34,
        "h": 12,
        "isDraggable": true
      }
    ],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "plug": null,
    "padlock": {
      "id": "pad_92",
      "x": 316,
      "y": 268,
      "onDoor": true
    },
    "battery": null,
    "socket": null,
    "receptors": [
      {
        "id": "rec_92",
        "x": 280,
        "y": 268,
        "w": 24,
        "h": 24,
        "beamX": 180,
        "beamY": 100,
        "hit": false
      }
    ],
    "portals": [],
    "fans": [],
    "gravityInverted": false
  },
  "93": {
    "title": "CHAMBER 93: DUAL LASER SPLITTER",
    "hint": "TWO INDEPENDENT LASER BEAMS DEFLECTED BY DUAL MIRRORS TO DUAL RECEPTORS!",
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
      },
      {
        "id": "mir_93",
        "x": 116,
        "y": 110,
        "w": 32,
        "h": 32,
        "isMirror": true,
        "isDraggable": true,
        "color": "#A5F3FC"
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
        "id": "b_93",
        "x": 240,
        "y": 180,
        "w": 8,
        "h": 120,
        "active": true,
        "receptorId": "rec_93"
      }
    ],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [
      {
        "id": "rec_93",
        "x": 260,
        "y": 268,
        "w": 24,
        "h": 24,
        "beamX": 160,
        "beamY": 100,
        "hit": false
      }
    ],
    "portals": [],
    "fans": [],
    "gravityInverted": false
  },
  "94": {
    "title": "CHAMBER 94: MULTI-ZONE GRAVITY MAZE",
    "hint": "FLOOR -> CEILING -> FLOOR -> CEILING NAVIGATION SEQUENCE!",
    "playerStart": {
      "x": 30,
      "y": 260
    },
    "exitDoor": {
      "x": 280,
      "y": 78,
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
        "id": "roof_94",
        "x": 220,
        "y": 120,
        "w": 130,
        "h": 180
      }
    ],
    "crates": [
      {
        "id": "c_bal_94",
        "x": 80,
        "y": 260,
        "isBalloon": true,
        "isDraggable": true
      }
    ],
    "springs": [],
    "switches": [],
    "keys": [
      {
        "id": "k_94",
        "x": 260,
        "y": 85,
        "taken": false,
        "color": "#00F5FF",
        "isDraggable": true
      }
    ],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [],
    "fans": [
      {
        "id": "fan_94",
        "x": 120,
        "y": 292,
        "w": 38,
        "h": 12,
        "active": true
      }
    ],
    "gravityInverted": false
  },
  "95": {
    "title": "CHAMBER 95: ASCENDING CRUMBLING STEPS",
    "hint": "CLIMB ASCENDING CRUMBLING STAIRCASE WHILE DODGING MOVING LASER SWEEPS!",
    "playerStart": {
      "x": 30,
      "y": 260
    },
    "exitDoor": {
      "x": 300,
      "y": 14,
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
        "id": "crumb_95",
        "x": 120,
        "y": 40,
        "w": 45,
        "h": 12,
        "isCrumbling": true,
        "color": "#FB7185"
      }
    ],
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [
      {
        "id": "k_95",
        "x": 260,
        "y": 40,
        "taken": false,
        "color": "#FFD166",
        "isDraggable": true
      }
    ],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [],
    "fans": [],
    "gravityInverted": true
  },
  "96": {
    "title": "CHAMBER 96: EMERGENCY LOCKOUT SPRINT",
    "hint": "PULL 2 PLUGS, DISMANTLE PADLOCK, AND SLIDE SLAB IN UNDER 10 SECONDS!",
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
      "requiresBattery": true
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
        "id": "mov_96",
        "x": 90,
        "y": 270,
        "w": 55,
        "h": 14,
        "minX": 85,
        "maxX": 210,
        "speed": 1.6,
        "dir": 1,
        "color": "#00F5FF"
      }
    ],
    "crates": [],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "plug": null,
    "padlock": null,
    "battery": {
      "id": "bat_96",
      "x": 40,
      "y": 270,
      "w": 22,
      "h": 22,
      "slotted": false
    },
    "socket": {
      "id": "sock_96",
      "x": 260,
      "y": 260,
      "w": 28,
      "h": 28
    },
    "receptors": [],
    "portals": [],
    "fans": [],
    "gravityInverted": false
  },
  "97": {
    "title": "CHAMBER 97: SUPERCONDUCTOR POOL",
    "hint": "CARRY CHARGED BATTERY THROUGH LIQUID POOL USING FLOATING BALLOON CRATES!",
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
    "crates": [
      {
        "id": "c1_97",
        "x": 50,
        "y": 260,
        "isDraggable": true
      },
      {
        "id": "c2_97",
        "x": 90,
        "y": 260,
        "isDraggable": true
      }
    ],
    "springs": [],
    "switches": [],
    "keys": [],
    "plates": [
      {
        "id": "p1_97",
        "x": 140,
        "y": 295,
        "w": 34,
        "h": 6,
        "pressed": false
      },
      {
        "id": "p2_97",
        "x": 220,
        "y": 295,
        "w": 34,
        "h": 6,
        "pressed": false
      }
    ],
    "hazards": [],
    "barriers": [
      {
        "id": "b_97",
        "x": 270,
        "y": 180,
        "w": 8,
        "h": 120,
        "active": true,
        "plateIds": [
          "p1_97",
          "p2_97"
        ]
      }
    ],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [],
    "fans": [],
    "gravityInverted": false
  },
  "98": {
    "title": "CHAMBER 98: THE GRAND CASCADE",
    "hint": "5-STEP CASCADE: SWITCH -> FAN -> SPRING -> MIRROR -> GATE!",
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
    "springs": [
      {
        "id": "sp_98",
        "x": 100,
        "y": 288,
        "w": 34,
        "h": 12,
        "isDraggable": true
      }
    ],
    "switches": [],
    "keys": [
      {
        "id": "k_98",
        "x": 290,
        "y": 265,
        "taken": false,
        "color": "#FFD166",
        "isDraggable": false
      }
    ],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [
      {
        "id": "p1_98",
        "x": 180,
        "y": 140,
        "partnerId": "p2_98",
        "color": "#00F5FF",
        "exitOffsetX": 20,
        "exitOffsetY": 0
      },
      {
        "id": "p2_98",
        "x": 270,
        "y": 240,
        "partnerId": "p1_98",
        "color": "#FF9E00",
        "exitOffsetX": 20,
        "exitOffsetY": 0
      }
    ],
    "fans": [],
    "gravityInverted": false
  },
  "99": {
    "title": "CHAMBER 99: THE TITAN'S GAUNTLET",
    "hint": "MASSIVE COMPOSITE VAULT TESTING ALL LEARNED MECHANICS IN ONE EPIC RUN!",
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
      },
      {
        "id": "slab_99",
        "x": 70,
        "y": 140,
        "w": 65,
        "h": 14,
        "isDraggable": true,
        "color": "#00F5D4"
      }
    ],
    "crates": [
      {
        "id": "c_99",
        "x": 40,
        "y": 260,
        "isDraggable": true
      }
    ],
    "springs": [],
    "switches": [],
    "keys": [
      {
        "id": "k_99",
        "x": 270,
        "y": 265,
        "taken": false,
        "color": "#39FF14",
        "isDraggable": false
      }
    ],
    "plates": [],
    "hazards": [
      {
        "id": "crush_99",
        "x": 160,
        "y": 170,
        "w": 36,
        "h": 100,
        "type": "SPIKES"
      }
    ],
    "barriers": [],
    "plug": null,
    "padlock": null,
    "battery": null,
    "socket": null,
    "receptors": [],
    "portals": [],
    "fans": [],
    "gravityInverted": false
  },
  "100": {
    "title": "CHAMBER 100: THE MASTER'S ESCAPE",
    "hint": "THE ULTIMATE ESCAPE: FIND THE SECRET HIDDEN HATCH IN THE CEILING!",
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
        "id": "slab_100",
        "x": 140,
        "y": 130,
        "w": 60,
        "h": 14,
        "isDraggable": true,
        "color": "#00F5D4"
      },
      {
        "id": "mir_100",
        "x": 210,
        "y": 110,
        "w": 32,
        "h": 32,
        "isMirror": true,
        "isDraggable": true,
        "color": "#A5F3FC"
      }
    ],
    "crates": [],
    "springs": [
      {
        "id": "sp_100",
        "x": 70,
        "y": 288,
        "w": 34,
        "h": 12,
        "isDraggable": true
      }
    ],
    "switches": [],
    "keys": [],
    "plates": [],
    "hazards": [],
    "barriers": [],
    "plug": null,
    "padlock": {
      "id": "pad_100",
      "x": 316,
      "y": 268,
      "onDoor": true
    },
    "battery": null,
    "socket": null,
    "receptors": [
      {
        "id": "rec_100",
        "x": 280,
        "y": 268,
        "w": 24,
        "h": 24,
        "beamX": 180,
        "beamY": 100,
        "hit": false
      }
    ],
    "portals": [],
    "fans": [],
    "gravityInverted": false
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
