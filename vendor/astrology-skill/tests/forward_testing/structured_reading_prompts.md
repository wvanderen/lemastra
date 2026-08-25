# Structured Reading Test Prompts

Use these prompts for forward testing the skill against realistic structured
reading requests. They provide the skill and raw chart data without leaking
expected answers.

## Natal Vocation Prompt

```json
{
  "reading_type": "natal",
  "tradition_mode": "blended",
  "tone": "practical",
  "user_question": "I am trying to choose between staying in a stable operations role, moving toward teaching and writing, or building an independent consulting practice. What vocational pattern is strongest from the supplied chart data?",
  "chart_data": {
    "source_notes": "Already-calculated tropical chart from an external astrology program.",
    "birth_time_confidence": "high; birth certificate time",
    "house_system": "Whole Sign",
    "ascendant": {
      "sign": "Virgo",
      "degree": 18.4
    },
    "midheaven": {
      "sign": "Gemini",
      "degree": 16.1
    },
    "sect": {
      "status": "day",
      "luminary_of_sect": "Sun",
      "sect_mate_planets": ["Jupiter", "Saturn"]
    },
    "placements": [
      {
        "body": "Sun",
        "sign": "Taurus",
        "degree": 12.2,
        "house": 9,
        "motion": "direct",
        "rules_houses": [12],
        "notes": "Above horizon."
      },
      {
        "body": "Moon",
        "sign": "Capricorn",
        "degree": 8.6,
        "house": 5,
        "motion": "direct",
        "rules_houses": [11]
      },
      {
        "body": "Mercury",
        "sign": "Gemini",
        "degree": 15.7,
        "house": 10,
        "motion": "direct",
        "condition": ["domicile"],
        "dignity": ["domicile"],
        "rules_houses": [1, 10],
        "notes": "Conjunct the Midheaven within 1 degree."
      },
      {
        "body": "Venus",
        "sign": "Aries",
        "degree": 26.3,
        "house": 8,
        "motion": "direct",
        "condition": ["detriment"],
        "rules_houses": [2, 9]
      },
      {
        "body": "Mars",
        "sign": "Cancer",
        "degree": 17.5,
        "house": 11,
        "motion": "direct",
        "condition": ["fall"],
        "rules_houses": [3, 8]
      },
      {
        "body": "Jupiter",
        "sign": "Libra",
        "degree": 16.9,
        "house": 2,
        "motion": "retrograde",
        "rules_houses": [4, 7]
      },
      {
        "body": "Saturn",
        "sign": "Aquarius",
        "degree": 13.0,
        "house": 6,
        "motion": "direct",
        "condition": ["domicile"],
        "dignity": ["domicile"],
        "rules_houses": [5, 6]
      }
    ],
    "aspects": [
      {
        "body_a": "Mercury",
        "aspect": "trine",
        "body_b": "Jupiter",
        "orb_degrees": 1.2,
        "applying": true
      },
      {
        "body_a": "Mercury",
        "aspect": "trine",
        "body_b": "Saturn",
        "orb_degrees": 2.7,
        "applying": false
      },
      {
        "body_a": "Sun",
        "aspect": "square",
        "body_b": "Saturn",
        "orb_degrees": 0.8,
        "applying": true
      },
      {
        "body_a": "Mars",
        "aspect": "square",
        "body_b": "Jupiter",
        "orb_degrees": 0.6,
        "applying": false
      }
    ]
  }
}
```

## Transit Prompt

```json
{
  "reading_type": "transit",
  "tradition_mode": "blended",
  "tone": "beginner-friendly",
  "user_question": "I want a grounded reading of the main themes around this Saturn transit to my Moon. Please avoid event predictions and focus on how to work with the timing.",
  "chart_data": {
    "source_notes": "Natal placements and current transits already calculated by external software.",
    "birth_time_confidence": "high; recorded birth time",
    "house_system": "Whole Sign",
    "ascendant": {
      "sign": "Sagittarius",
      "degree": 6.8
    },
    "sect": "night",
    "placements": [
      {
        "body": "Moon",
        "sign": "Pisces",
        "degree": 12.4,
        "house": 4,
        "motion": "direct",
        "rules_houses": [8],
        "notes": "Natal Moon."
      },
      {
        "body": "Saturn",
        "sign": "Virgo",
        "degree": 13.1,
        "house": 10,
        "motion": "direct",
        "rules_houses": [2, 3],
        "notes": "Natal Saturn."
      },
      {
        "body": "Sun",
        "sign": "Cancer",
        "degree": 27.5,
        "house": 8,
        "motion": "direct",
        "rules_houses": [9]
      }
    ],
    "aspects": [
      {
        "body_a": "Moon",
        "aspect": "opposition",
        "body_b": "Saturn",
        "orb_degrees": 0.7,
        "applying": false,
        "notes": "Natal aspect."
      }
    ],
    "timing_factors": [
      {
        "technique": "transit",
        "date": "2026-03-18",
        "triggering_body": "Saturn",
        "natal_body": "Moon",
        "aspect": "conjunction",
        "orb_degrees": 0.2,
        "description": "Transiting Saturn in Pisces conjunct natal Moon in the 4th house, first exact pass."
      },
      {
        "technique": "transit",
        "date": "2026-04-05",
        "triggering_body": "Mars",
        "natal_body": "Moon",
        "aspect": "trine",
        "orb_degrees": 0.8,
        "description": "Transiting Mars briefly activates natal Moon during the Saturn season."
      }
    ]
  }
}
```

## Synastry Prompt

```json
{
  "reading_type": "synastry",
  "tradition_mode": "modern",
  "tone": "psychological",
  "user_question": "We are collaborators considering a long-term creative partnership, not a romantic couple. Please read the strongest inter-chart dynamics and keep the language consent-sensitive and practical.",
  "chart_data": {
    "source_notes": "Two already-calculated natal charts and inter-chart aspects. Houses are only included where both birth times are reliable.",
    "person_a": {
      "label": "Person A",
      "birth_time_confidence": "high",
      "placements": [
        {
          "body": "Sun",
          "sign": "Leo",
          "degree": 4.2,
          "house": 10
        },
        {
          "body": "Moon",
          "sign": "Scorpio",
          "degree": 18.9,
          "house": 1
        },
        {
          "body": "Mercury",
          "sign": "Virgo",
          "degree": 9.1,
          "house": 11
        },
        {
          "body": "Venus",
          "sign": "Libra",
          "degree": 14.6,
          "house": 12
        },
        {
          "body": "Mars",
          "sign": "Gemini",
          "degree": 21.3,
          "house": 8
        },
        {
          "body": "Saturn",
          "sign": "Aquarius",
          "degree": 19.5,
          "house": 4
        }
      ]
    },
    "person_b": {
      "label": "Person B",
      "birth_time_confidence": "high",
      "placements": [
        {
          "body": "Sun",
          "sign": "Scorpio",
          "degree": 17.8,
          "house": 3
        },
        {
          "body": "Moon",
          "sign": "Leo",
          "degree": 5.0,
          "house": 12
        },
        {
          "body": "Mercury",
          "sign": "Gemini",
          "degree": 22.0,
          "house": 10
        },
        {
          "body": "Venus",
          "sign": "Aries",
          "degree": 14.0,
          "house": 8
        },
        {
          "body": "Mars",
          "sign": "Libra",
          "degree": 15.1,
          "house": 2
        },
        {
          "body": "Saturn",
          "sign": "Scorpio",
          "degree": 19.3,
          "house": 3
        }
      ]
    },
    "aspects": [
      {
        "body_a": "Person A Moon",
        "aspect": "conjunction",
        "body_b": "Person B Saturn",
        "orb_degrees": 0.4,
        "applying": true
      },
      {
        "body_a": "Person A Venus",
        "aspect": "conjunction",
        "body_b": "Person B Mars",
        "orb_degrees": 0.5,
        "applying": false
      },
      {
        "body_a": "Person A Mars",
        "aspect": "conjunction",
        "body_b": "Person B Mercury",
        "orb_degrees": 0.7,
        "applying": true
      },
      {
        "body_a": "Person A Sun",
        "aspect": "conjunction",
        "body_b": "Person B Moon",
        "orb_degrees": 0.8,
        "applying": false
      }
    ]
  }
}
```

## Incomplete-Data Prompt

```json
{
  "reading_type": "natal",
  "tradition_mode": "blended",
  "tone": "practical",
  "user_question": "I do not know my birth time, but I want a cautious reading about vocation and burnout patterns from what is available. Please say what cannot be judged without houses or angles.",
  "chart_data": {
    "source_notes": "Date and place are known; birth time is unknown. Placements are sign-only except where degree was provided by the source.",
    "birth_time_confidence": "unknown; no recorded birth time",
    "house_system": "not available",
    "sect": "unknown",
    "placements": [
      {
        "body": "Sun",
        "sign": "Sagittarius",
        "degree": 23.4,
        "motion": "direct"
      },
      {
        "body": "Moon",
        "sign": "Virgo",
        "motion": "unknown",
        "notes": "Moon sign is listed by source, but degree and exact aspects are not supplied."
      },
      {
        "body": "Mercury",
        "sign": "Capricorn",
        "degree": 1.2,
        "motion": "direct"
      },
      {
        "body": "Venus",
        "sign": "Scorpio",
        "degree": 29.1,
        "motion": "direct"
      },
      {
        "body": "Mars",
        "sign": "Virgo",
        "degree": 6.8,
        "motion": "direct"
      },
      {
        "body": "Jupiter",
        "sign": "Pisces",
        "degree": 7.4,
        "motion": "direct",
        "condition": ["domicile"],
        "dignity": ["domicile"]
      },
      {
        "body": "Saturn",
        "sign": "Gemini",
        "degree": 10.2,
        "motion": "retrograde"
      }
    ],
    "aspects": [
      {
        "body_a": "Mars",
        "aspect": "opposition",
        "body_b": "Jupiter",
        "orb_degrees": 0.6,
        "applying": true
      },
      {
        "body_a": "Mercury",
        "aspect": "quincunx",
        "body_b": "Saturn",
        "orb_degrees": 9.0,
        "notes": "Wide minor aspect (quincunx, ~150 deg) supplied by source; applying/separating not provided. Treat as background only."
      }
    ]
  }
}
```

## Annual Profection Prompt

Use this prompt to exercise the annual profection workflow, the classical
time-lord framing, and the supplied-versus-derived timing distinction.

```json
{
  "reading_type": "annual_profection",
  "tradition_mode": "blended",
  "tone": "practical",
  "user_question": "I just turned 28 and I am trying to understand what this year is about, especially around work and resources. Please anchor the year in the profection structure and then describe how the supplied transits modify it. Avoid predicting specific events.",
  "chart_data": {
    "source_notes": "Already-calculated tropical chart and annual profection data from an external astrology program.",
    "birth_time_confidence": "high; birth certificate time",
    "house_system": "Whole Sign",
    "ascendant": {
      "sign": "Scorpio",
      "degree": 9.3
    },
    "sect": {
      "status": "night",
      "luminary_of_sect": "Moon",
      "sect_mate_planets": ["Venus", "Mars"]
    },
    "placements": [
      {
        "body": "Sun",
        "sign": "Taurus",
        "degree": 4.1,
        "house": 7,
        "motion": "direct",
        "rules_houses": [10]
      },
      {
        "body": "Moon",
        "sign": "Pisces",
        "degree": 22.7,
        "house": 5,
        "motion": "direct",
        "rules_houses": [9]
      },
      {
        "body": "Mercury",
        "sign": "Aries",
        "degree": 18.0,
        "house": 6,
        "motion": "direct",
        "rules_houses": [8, 11]
      },
      {
        "body": "Venus",
        "sign": "Gemini",
        "degree": 3.5,
        "house": 8,
        "motion": "direct",
        "condition": ["domicile"],
        "dignity": ["domicile"],
        "rules_houses": [7, 12]
      },
      {
        "body": "Mars",
        "sign": "Capricorn",
        "degree": 14.8,
        "house": 3,
        "motion": "direct",
        "condition": ["exaltation"],
        "dignity": ["exaltation"],
        "rules_houses": [1, 6]
      },
      {
        "body": "Jupiter",
        "sign": "Cancer",
        "degree": 5.9,
        "house": 9,
        "motion": "direct",
        "condition": ["exaltation"],
        "dignity": ["exaltation"],
        "rules_houses": [2, 5]
      },
      {
        "body": "Saturn",
        "sign": "Pisces",
        "degree": 11.2,
        "house": 5,
        "motion": "direct",
        "rules_houses": [3, 4]
      }
    ],
    "aspects": [
      {
        "body_a": "Mars",
        "aspect": "opposition",
        "body_b": "Jupiter",
        "orb_degrees": 8.9,
        "applying": false
      },
      {
        "body_a": "Venus",
        "aspect": "square",
        "body_b": "Saturn",
        "orb_degrees": 7.7,
        "applying": true
      }
    ],
    "timing_factors": [
      {
        "technique": "annual_profection",
        "age": 28,
        "birthday_occurred": true,
        "profected_house": 5,
        "lord_of_year": "Jupiter",
        "notes": "Profection to the 5th house counted from the Scorpio Ascendant; Lord of the Year supplied by the source."
      },
      {
        "technique": "transit",
        "date": "2026-05-02",
        "triggering_body": "Jupiter",
        "natal_body": "Jupiter",
        "aspect": "conjunction",
        "orb_degrees": 0.4,
        "description": "Transiting Jupiter returning to its natal place during the 5th-house profection year."
      },
      {
        "technique": "transit",
        "date": "2026-02-14",
        "triggering_body": "Saturn",
        "natal_body": "Venus",
        "aspect": "square",
        "orb_degrees": 1.1,
        "description": "Transiting Saturn in Pisces squaring natal Venus in Gemini."
      }
    ]
  }
}
```

## Natal Resources Prompt

Use this prompt to exercise the enriched resources synthesis pattern and the
incomplete-birth-time weighting guidance. It deliberately supplies no houses,
angles, or sect so the reading must name those limits before synthesizing.

```json
{
  "reading_type": "natal",
  "tradition_mode": "blended",
  "tone": "practical",
  "user_question": "I want a grounded read of my relationship with money, earning, and security from the placements I have. I do not have a reliable birth time, so please say up front what cannot be judged without houses.",
  "chart_data": {
    "source_notes": "Date and place are known; birth time is unknown. Placements are sign-only except where a degree was provided by the source.",
    "birth_time_confidence": "unknown; no recorded birth time",
    "house_system": "not available",
    "sect": "unknown",
    "placements": [
      {
        "body": "Sun",
        "sign": "Capricorn",
        "degree": 9.0,
        "motion": "direct"
      },
      {
        "body": "Moon",
        "sign": "Taurus",
        "motion": "unknown",
        "notes": "Moon sign listed by source; degree and exact aspects not supplied."
      },
      {
        "body": "Mercury",
        "sign": "Sagittarius",
        "degree": 27.3,
        "motion": "direct"
      },
      {
        "body": "Venus",
        "sign": "Aquarius",
        "degree": 4.2,
        "motion": "direct"
      },
      {
        "body": "Mars",
        "sign": "Leo",
        "degree": 3.8,
        "motion": "direct"
      },
      {
        "body": "Jupiter",
        "sign": "Cancer",
        "degree": 8.1,
        "motion": "direct",
        "condition": ["exaltation"],
        "dignity": ["exaltation"]
      },
      {
        "body": "Saturn",
        "sign": "Aries",
        "degree": 12.4,
        "motion": "retrograde",
        "condition": ["fall"],
        "dignity": ["fall"]
      }
    ],
    "aspects": [
      {
        "body_a": "Venus",
        "aspect": "opposition",
        "body_b": "Mars",
        "orb_degrees": 0.4,
        "applying": false
      },
      {
        "body_a": "Jupiter",
        "aspect": "square",
        "body_b": "Saturn",
        "orb_degrees": 4.3,
        "applying": true
      }
    ]
  }
}
```

## Solar Return Prompt

Use this prompt to exercise the solar return workflow: the natal baseline as the return modifies it, the return chart ruler, return Sun/Moon, and the annual-emphasis-not-permanent-character guardrail. Both charts originate from the bundled calculator (self-consistent geometry).

```json
{
  "reading_type": "solar_return",
  "tradition_mode": "blended",
  "tone": "practical",
  "user_question": "I just had my birthday. What does the year ahead emphasize for my work, writing, and creative direction, given the return chart against my natal baseline? Please anchor the year in the solar return structure without predicting specific events.",
  "chart_data": {
    "natal_chart": {
      "source_notes": "Solar return natal baseline computed by pyswisseph/Swiss Ephemeris (tropical, Whole Sign). Pre-calculated; supplied as the return-year baseline.",
      "birth_time_confidence": "high; recorded birth time",
      "house_system": "Whole Sign",
      "ascendant": {
        "sign": "Virgo",
        "degree": 24.5
      },
      "sect": {
        "status": "day",
        "luminary_of_sect": "Sun",
        "sect_mate_planets": [
          "Jupiter",
          "Saturn"
        ]
      },
      "placements": [
        {
          "body": "Sun",
          "sign": "Gemini",
          "degree": 0.4,
          "house": 10,
          "motion": "direct",
          "rules_houses": [
            12
          ]
        },
        {
          "body": "Moon",
          "sign": "Aries",
          "degree": 21.8,
          "house": 8,
          "motion": "direct",
          "rules_houses": [
            11
          ]
        },
        {
          "body": "Mercury",
          "sign": "Taurus",
          "degree": 8.8,
          "house": 9,
          "motion": "direct",
          "rules_houses": [
            1,
            10
          ],
          "notes": "Chart ruler (Virgo Ascendant)."
        },
        {
          "body": "Venus",
          "sign": "Aries",
          "degree": 20.0,
          "house": 8,
          "motion": "direct",
          "condition": [
            "detriment"
          ],
          "dignity": [
            "detriment"
          ],
          "rules_houses": [
            2,
            9
          ]
        },
        {
          "body": "Mars",
          "sign": "Pisces",
          "degree": 23.0,
          "house": 7,
          "motion": "direct",
          "rules_houses": [
            3,
            8
          ]
        },
        {
          "body": "Jupiter",
          "sign": "Cancer",
          "degree": 10.8,
          "house": 11,
          "motion": "direct",
          "condition": [
            "exaltation"
          ],
          "dignity": [
            "exaltation"
          ],
          "rules_houses": [
            4,
            7
          ]
        },
        {
          "body": "Saturn",
          "sign": "Capricorn",
          "degree": 25.1,
          "house": 5,
          "motion": "retrograde",
          "condition": [
            "domicile"
          ],
          "dignity": [
            "domicile"
          ],
          "rules_houses": [
            5,
            6
          ]
        }
      ],
      "aspects": [
        {
          "body_a": "Moon",
          "aspect": "conjunction",
          "body_b": "Venus",
          "orb_degrees": 1.8,
          "separating": true
        },
        {
          "body_a": "Moon",
          "aspect": "square",
          "body_b": "Saturn",
          "orb_degrees": 3.3,
          "applying": true
        },
        {
          "body_a": "Mercury",
          "aspect": "sextile",
          "body_b": "Jupiter",
          "orb_degrees": 2.0,
          "applying": true
        },
        {
          "body_a": "Venus",
          "aspect": "square",
          "body_b": "Saturn",
          "orb_degrees": 5.1,
          "applying": true
        },
        {
          "body_a": "Mars",
          "aspect": "sextile",
          "body_b": "Saturn",
          "orb_degrees": 2.1,
          "applying": true
        }
      ],
      "midheaven": {
        "sign": "Gemini",
        "degree": 23.7
      }
    },
    "solar_return_chart": {
      "source_notes": "Solar return chart for 2026, computed by pyswisseph/Swiss Ephemeris at the exact moment the Sun returned to its natal position (tropical, Whole Sign, return location = birth location).",
      "birth_time_confidence": "high; recorded birth time",
      "house_system": "Whole Sign",
      "ascendant": {
        "sign": "Gemini",
        "degree": 29.8
      },
      "midheaven": {
        "sign": "Pisces",
        "degree": 6.1
      },
      "sect": {
        "status": "day",
        "luminary_of_sect": "Sun",
        "sect_mate_planets": [
          "Jupiter",
          "Saturn"
        ]
      },
      "placements": [
        {
          "body": "Sun",
          "sign": "Gemini",
          "degree": 0.4,
          "house": 1,
          "motion": "direct",
          "rules_houses": [
            3
          ],
          "notes": "Return Sun on the natal Sun degree."
        },
        {
          "body": "Moon",
          "sign": "Leo",
          "degree": 5.2,
          "house": 3,
          "motion": "direct",
          "rules_houses": [
            2
          ]
        },
        {
          "body": "Mercury",
          "sign": "Gemini",
          "degree": 8.7,
          "house": 1,
          "motion": "direct",
          "condition": [
            "domicile"
          ],
          "dignity": [
            "domicile"
          ],
          "rules_houses": [
            1,
            4
          ],
          "notes": "Return chart ruler; domicile in the 1st house."
        },
        {
          "body": "Venus",
          "sign": "Cancer",
          "degree": 2.9,
          "house": 2,
          "motion": "direct",
          "rules_houses": [
            5,
            12
          ]
        },
        {
          "body": "Mars",
          "sign": "Taurus",
          "degree": 1.9,
          "house": 12,
          "motion": "direct",
          "condition": [
            "detriment"
          ],
          "dignity": [
            "detriment"
          ],
          "rules_houses": [
            6,
            11
          ]
        },
        {
          "body": "Jupiter",
          "sign": "Cancer",
          "degree": 22.2,
          "house": 2,
          "motion": "direct",
          "condition": [
            "exaltation"
          ],
          "dignity": [
            "exaltation"
          ],
          "rules_houses": [
            7,
            10
          ]
        },
        {
          "body": "Saturn",
          "sign": "Aries",
          "degree": 11.3,
          "house": 11,
          "motion": "direct",
          "condition": [
            "fall"
          ],
          "dignity": [
            "fall"
          ],
          "rules_houses": [
            8,
            9
          ]
        }
      ],
      "aspects": [
        {
          "body_a": "Venus",
          "aspect": "sextile",
          "body_b": "Mars",
          "orb_degrees": 1.0,
          "separating": true
        },
        {
          "body_a": "Mercury",
          "aspect": "sextile",
          "body_b": "Saturn",
          "orb_degrees": 2.6,
          "applying": true
        },
        {
          "body_a": "Moon",
          "aspect": "trine",
          "body_b": "Saturn",
          "orb_degrees": 6.1,
          "applying": true
        },
        {
          "body_a": "Moon",
          "aspect": "square",
          "body_b": "Mars",
          "orb_degrees": 3.3,
          "separating": true
        }
      ]
    }
  }
}
```


## Horary Prompt

Use this prompt to exercise the horary workflow: question restatement, querent/quesited significator assignment, the Moon as co-significator, reception/perfection, and the Saturn-in-the-7th radicality caution. Geometry from the bundled calculator.

```json
{
  "reading_type": "horary",
  "tradition_mode": "blended",
  "tone": "practical",
  "user_question": "A collaborator has proposed a formal creative partnership. Will this collaboration come together and hold? Please state the question, the significators, and any radicality cautions before judging. Avoid fear-based or event-certain language.",
  "chart_data": {
    "source_notes": "Horary chart computed by pyswisseph/Swiss Ephemeris for the moment the question was received and understood (tropical, Whole Sign).",
    "birth_time_confidence": "high; recorded birth time",
    "house_system": "Whole Sign",
    "ascendant": {
      "sign": "Libra",
      "degree": 12.9
    },
    "midheaven": {
      "sign": "Cancer",
      "degree": 15.2
    },
    "sect": {
      "status": "day",
      "luminary_of_sect": "Sun",
      "sect_mate_planets": [
        "Jupiter",
        "Saturn"
      ]
    },
    "placements": [
      {
        "body": "Sun",
        "sign": "Gemini",
        "degree": 24.7,
        "house": 9,
        "motion": "direct",
        "rules_houses": [
          11
        ]
      },
      {
        "body": "Moon",
        "sign": "Cancer",
        "degree": 4.5,
        "house": 10,
        "motion": "direct",
        "condition": [
          "domicile"
        ],
        "dignity": [
          "domicile"
        ],
        "rules_houses": [
          10
        ],
        "notes": "Moon as co-significator; domicile in the 10th house."
      },
      {
        "body": "Mercury",
        "sign": "Cancer",
        "degree": 19.2,
        "house": 10,
        "motion": "direct",
        "rules_houses": [
          9,
          12
        ]
      },
      {
        "body": "Venus",
        "sign": "Leo",
        "degree": 2.7,
        "house": 11,
        "motion": "direct",
        "rules_houses": [
          1,
          8
        ],
        "notes": "Querent significator: Ascendant ruler in the 11th house."
      },
      {
        "body": "Mars",
        "sign": "Taurus",
        "degree": 20.6,
        "house": 8,
        "motion": "direct",
        "condition": [
          "detriment"
        ],
        "dignity": [
          "detriment"
        ],
        "rules_houses": [
          2,
          7
        ],
        "notes": "Quesited significator: ruler of the 7th house (the prospective partner)."
      },
      {
        "body": "Jupiter",
        "sign": "Cancer",
        "degree": 27.0,
        "house": 10,
        "motion": "direct",
        "condition": [
          "exaltation"
        ],
        "dignity": [
          "exaltation"
        ],
        "rules_houses": [
          3,
          6
        ]
      },
      {
        "body": "Saturn",
        "sign": "Aries",
        "degree": 13.4,
        "house": 7,
        "motion": "direct",
        "condition": [
          "fall"
        ],
        "dignity": [
          "fall"
        ],
        "rules_houses": [
          4,
          5
        ],
        "notes": "In the 7th house (radicality caution)."
      }
    ],
    "aspects": [
      {
        "body_a": "Mercury",
        "aspect": "sextile",
        "body_b": "Mars",
        "orb_degrees": 1.4,
        "applying": true
      },
      {
        "body_a": "Mercury",
        "aspect": "conjunction",
        "body_b": "Jupiter",
        "orb_degrees": 7.8,
        "applying": true
      },
      {
        "body_a": "Venus",
        "aspect": "conjunction",
        "body_b": "Jupiter",
        "orb_degrees": 5.7,
        "separating": true
      },
      {
        "body_a": "Moon",
        "aspect": "square",
        "body_b": "Saturn",
        "orb_degrees": 8.9,
        "applying": true
      },
      {
        "body_a": "Mercury",
        "aspect": "square",
        "body_b": "Saturn",
        "orb_degrees": 5.8,
        "separating": true
      }
    ]
  }
}
```


## Electional Prompt

Use this prompt to exercise the electional workflow: comparing two candidate start charts against one stated goal, ranking by topic-ruler/Moon/chart-ruler condition, benefic support, malefic mitigation, and practical tradeoffs. Both candidates originate from the bundled calculator.

```json
{
  "reading_type": "electional",
  "tradition_mode": "blended",
  "tone": "practical",
  "user_question": "I am launching an independent newsletter/creative publication and can choose between two start charts (one week apart). Please compare the candidates for this public, communication-focused launch, name each chart's strongest support and main liability, and avoid promising success from astrology alone.",
  "chart_data": {
    "candidate_charts": [
      {
        "label": "Candidate A",
        "birth_time_confidence": "high; recorded birth time",
        "ascendant_note": "Early Ascendant (1.2 deg) — caution that the matter is still forming.",
        "source_notes": "Two candidate electional charts computed by pyswisseph/Swiss Ephemeris (tropical, Whole Sign), same location, one week apart.",
        "house_system": "Whole Sign",
        "ascendant": {
          "sign": "Scorpio",
          "degree": 1.2
        },
        "midheaven": {
          "sign": "Leo",
          "degree": 7.2
        },
        "sect": {
          "status": "day",
          "luminary_of_sect": "Sun",
          "sect_mate_planets": [
            "Jupiter",
            "Saturn"
          ]
        },
        "placements": [
          {
            "body": "Sun",
            "sign": "Virgo",
            "degree": 21.8,
            "house": 11,
            "motion": "direct",
            "rules_houses": [
              10
            ]
          },
          {
            "body": "Moon",
            "sign": "Scorpio",
            "degree": 3.9,
            "house": 1,
            "motion": "direct",
            "condition": [
              "fall"
            ],
            "dignity": [
              "fall"
            ],
            "rules_houses": [
              9
            ],
            "notes": "Moon in the 1st house, conjunct the Ascendant."
          },
          {
            "body": "Mercury",
            "sign": "Libra",
            "degree": 6.5,
            "house": 12,
            "motion": "direct",
            "rules_houses": [
              8,
              11
            ]
          },
          {
            "body": "Venus",
            "sign": "Scorpio",
            "degree": 2.6,
            "house": 1,
            "motion": "direct",
            "condition": [
              "detriment"
            ],
            "dignity": [
              "detriment"
            ],
            "rules_houses": [
              7,
              12
            ],
            "notes": "Conjunct the Moon and Ascendant in the 1st."
          },
          {
            "body": "Mars",
            "sign": "Cancer",
            "degree": 21.9,
            "house": 9,
            "motion": "direct",
            "condition": [
              "fall"
            ],
            "dignity": [
              "fall"
            ],
            "rules_houses": [
              1,
              6
            ],
            "notes": "Chart ruler (Scorpio Ascendant); in fall."
          },
          {
            "body": "Jupiter",
            "sign": "Leo",
            "degree": 16.5,
            "house": 10,
            "motion": "direct",
            "rules_houses": [
              2,
              5
            ],
            "notes": "In the 10th house."
          },
          {
            "body": "Saturn",
            "sign": "Aries",
            "degree": 12.8,
            "house": 6,
            "motion": "retrograde",
            "condition": [
              "fall"
            ],
            "dignity": [
              "fall"
            ],
            "rules_houses": [
              3,
              4
            ]
          }
        ],
        "aspects": [
          {
            "body_a": "Sun",
            "aspect": "sextile",
            "body_b": "Mars",
            "orb_degrees": 0.1,
            "applying": true
          },
          {
            "body_a": "Moon",
            "aspect": "conjunction",
            "body_b": "Venus",
            "orb_degrees": 1.3,
            "separating": true
          },
          {
            "body_a": "Mercury",
            "aspect": "opposition",
            "body_b": "Saturn",
            "orb_degrees": 6.3,
            "applying": true
          },
          {
            "body_a": "Jupiter",
            "aspect": "trine",
            "body_b": "Saturn",
            "orb_degrees": 3.7,
            "separating": true
          }
        ]
      },
      {
        "label": "Candidate B",
        "birth_time_confidence": "high; recorded birth time",
        "source_notes": "Two candidate electional charts computed by pyswisseph/Swiss Ephemeris (tropical, Whole Sign), same location, one week apart.",
        "house_system": "Whole Sign",
        "ascendant": {
          "sign": "Sagittarius",
          "degree": 15.5
        },
        "midheaven": {
          "sign": "Libra",
          "degree": 5.8
        },
        "sect": {
          "status": "day",
          "luminary_of_sect": "Sun",
          "sect_mate_planets": [
            "Jupiter",
            "Saturn"
          ]
        },
        "placements": [
          {
            "body": "Sun",
            "sign": "Virgo",
            "degree": 28.7,
            "house": 10,
            "motion": "direct",
            "rules_houses": [
              9
            ],
            "notes": "Sun in the 10th house."
          },
          {
            "body": "Moon",
            "sign": "Aquarius",
            "degree": 0.0,
            "house": 3,
            "motion": "direct",
            "rules_houses": [
              8
            ]
          },
          {
            "body": "Mercury",
            "sign": "Libra",
            "degree": 17.6,
            "house": 11,
            "motion": "direct",
            "rules_houses": [
              7,
              10
            ]
          },
          {
            "body": "Venus",
            "sign": "Scorpio",
            "degree": 6.1,
            "house": 12,
            "motion": "direct",
            "condition": [
              "detriment"
            ],
            "dignity": [
              "detriment"
            ],
            "rules_houses": [
              6,
              11
            ],
            "notes": "In the 12th house."
          },
          {
            "body": "Mars",
            "sign": "Cancer",
            "degree": 26.2,
            "house": 8,
            "motion": "direct",
            "condition": [
              "fall"
            ],
            "dignity": [
              "fall"
            ],
            "rules_houses": [
              5,
              12
            ]
          },
          {
            "body": "Jupiter",
            "sign": "Leo",
            "degree": 17.9,
            "house": 9,
            "motion": "direct",
            "rules_houses": [
              1,
              4
            ],
            "notes": "Chart ruler (Sagittarius Ascendant)."
          },
          {
            "body": "Saturn",
            "sign": "Aries",
            "degree": 12.3,
            "house": 5,
            "motion": "retrograde",
            "condition": [
              "fall"
            ],
            "dignity": [
              "fall"
            ],
            "rules_houses": [
              2,
              3
            ]
          }
        ],
        "aspects": [
          {
            "body_a": "Sun",
            "aspect": "trine",
            "body_b": "Moon",
            "orb_degrees": 1.3,
            "separating": true
          },
          {
            "body_a": "Mercury",
            "aspect": "sextile",
            "body_b": "Jupiter",
            "orb_degrees": 0.3,
            "applying": true
          },
          {
            "body_a": "Sun",
            "aspect": "sextile",
            "body_b": "Mars",
            "orb_degrees": 2.5,
            "separating": true
          },
          {
            "body_a": "Mercury",
            "aspect": "opposition",
            "body_b": "Saturn",
            "orb_degrees": 5.3,
            "separating": true
          },
          {
            "body_a": "Jupiter",
            "aspect": "trine",
            "body_b": "Saturn",
            "orb_degrees": 5.6,
            "separating": true
          }
        ]
      }
    ]
  }
}
```


## Mundane Prompt

Use this prompt to exercise the mundane workflow for a 2026 Aries ingress chart set for Washington, DC: entity/chart-type framing, mundane houses (10th government, 2nd treasury, 11th legislature), chart-ruler and angular testimony, and the strict no-event-certainty / no-fear-based-language guardrails. Geometry from the bundled calculator at the exact ingress moment; scope-aligned to references/reading_types/mundane.md.

```json
{
  "reading_type": "mundane",
  "tradition_mode": "blended",
  "tone": "practical",
  "user_question": "What collective themes does the 2026 Aries ingress set for Washington, DC, suggest about the symbolic year for the United States, especially around governance, the legislature, and resources? Please keep every claim to symbolic emphasis for the period, with no prediction of elections, market moves, conflict, or disasters.",
  "chart_data": {
    "source_notes": "2026 Aries ingress (vernal equinox) chart computed by pyswisseph/Swiss Ephemeris for Washington, DC, at the exact moment the Sun entered Aries (tropical, Whole Sign). This is a period chart describing the symbolic year for the entity, not a forecast of events.",
    "birth_time_confidence": "high; ingress moment is astronomically exact",
    "house_system": "Whole Sign",
    "ascendant": {
      "sign": "Gemini",
      "degree": 13.4
    },
    "midheaven": {
      "sign": "Aquarius",
      "degree": 20.0
    },
    "sect": {
      "status": "day",
      "luminary_of_sect": "Sun",
      "sect_mate_planets": [
        "Jupiter",
        "Saturn"
      ]
    },
    "placements": [
      {
        "body": "Sun",
        "sign": "Aries",
        "degree": 0.0,
        "house": 11,
        "motion": "direct",
        "condition": [
          "exaltation"
        ],
        "dignity": [
          "exaltation"
        ],
        "rules_houses": [
          3
        ],
        "notes": "Ingress Sun at 0 deg Aries (the moment of entry), exalted, in the 11th house."
      },
      {
        "body": "Moon",
        "sign": "Aries",
        "degree": 20.5,
        "house": 11,
        "motion": "direct",
        "rules_houses": [
          2
        ]
      },
      {
        "body": "Mercury",
        "sign": "Pisces",
        "degree": 8.5,
        "house": 10,
        "motion": "retrograde",
        "condition": [
          "detriment"
        ],
        "dignity": [
          "detriment"
        ],
        "rules_houses": [
          1,
          4
        ],
        "notes": "Chart ruler; retrograde and in detriment in the 10th house (government/leadership)."
      },
      {
        "body": "Venus",
        "sign": "Aries",
        "degree": 17.6,
        "house": 11,
        "motion": "direct",
        "condition": [
          "detriment"
        ],
        "dignity": [
          "detriment"
        ],
        "rules_houses": [
          5,
          12
        ]
      },
      {
        "body": "Mars",
        "sign": "Pisces",
        "degree": 14.2,
        "house": 10,
        "motion": "direct",
        "rules_houses": [
          6,
          11
        ]
      },
      {
        "body": "Jupiter",
        "sign": "Cancer",
        "degree": 15.2,
        "house": 2,
        "motion": "direct",
        "condition": [
          "exaltation"
        ],
        "dignity": [
          "exaltation"
        ],
        "rules_houses": [
          7,
          10
        ],
        "notes": "Exalted in Cancer in the 2nd house (treasury/resources)."
      },
      {
        "body": "Saturn",
        "sign": "Aries",
        "degree": 4.1,
        "house": 11,
        "motion": "direct",
        "condition": [
          "fall"
        ],
        "dignity": [
          "fall"
        ],
        "rules_houses": [
          8,
          9
        ]
      }
    ],
    "aspects": [
      {
        "body_a": "Sun",
        "aspect": "conjunction",
        "body_b": "Saturn",
        "orb_degrees": 4.1,
        "applying": true
      },
      {
        "body_a": "Moon",
        "aspect": "conjunction",
        "body_b": "Venus",
        "orb_degrees": 2.9,
        "separating": true
      },
      {
        "body_a": "Venus",
        "aspect": "square",
        "body_b": "Jupiter",
        "orb_degrees": 2.4,
        "separating": true
      },
      {
        "body_a": "Mars",
        "aspect": "trine",
        "body_b": "Jupiter",
        "orb_degrees": 1.0,
        "applying": true
      },
      {
        "body_a": "Moon",
        "aspect": "square",
        "body_b": "Jupiter",
        "orb_degrees": 5.3,
        "separating": true
      }
    ]
  }
}
```


## Aspect Precision Stress-Test Prompt

**Intentional stress test** (labeled, not a bug). Use this prompt to exercise references/foundations/aspect_precision.md: the chart is geometrically self-consistent, but two aspects deliberately carry *partial precision* (one with the orb omitted, one with applying/separating omitted). The reading must weight each aspect only by the precision supplied and avoid asserting tightness, exactness, or building/waning status it cannot support. Unlike the four geometry mislabels td-06b45e caught (now corrected), this fixture is explicitly labeled so future walkthroughs do not consume the imprecision as a data-integrity bug.

```json
{
  "reading_type": "natal",
  "tradition_mode": "blended",
  "tone": "practical",
  "user_question": "Give me a grounded read of the strongest patterns in this chart, weighting the aspects by the precision actually supplied.",
  "chart_data": {
    "source_notes": "Natal chart computed by pyswisseph/Swiss Ephemeris (tropical, Whole Sign). INTENTIONAL PRECISION STRESS TEST: several aspects deliberately carry partial precision (omitted orb, omitted applying/separating). Exercises references/foundations/aspect_precision.md.",
    "birth_time_confidence": "high; recorded birth time",
    "house_system": "Whole Sign",
    "ascendant": {
      "sign": "Scorpio",
      "degree": 7.9
    },
    "midheaven": {
      "sign": "Leo",
      "degree": 9.6
    },
    "sect": {
      "status": "day",
      "luminary_of_sect": "Sun",
      "sect_mate_planets": [
        "Jupiter",
        "Saturn"
      ]
    },
    "placements": [
      {
        "body": "Sun",
        "sign": "Libra",
        "degree": 22.2,
        "house": 12,
        "motion": "direct",
        "condition": [
          "fall"
        ],
        "dignity": [
          "fall"
        ],
        "rules_houses": [
          10
        ]
      },
      {
        "body": "Moon",
        "sign": "Sagittarius",
        "degree": 12.8,
        "house": 2,
        "motion": "direct",
        "rules_houses": [
          9
        ]
      },
      {
        "body": "Mercury",
        "sign": "Libra",
        "degree": 13.8,
        "house": 12,
        "motion": "retrograde",
        "rules_houses": [
          8,
          11
        ]
      },
      {
        "body": "Venus",
        "sign": "Virgo",
        "degree": 12.6,
        "house": 11,
        "motion": "direct",
        "condition": [
          "fall"
        ],
        "dignity": [
          "fall"
        ],
        "rules_houses": [
          7,
          12
        ]
      },
      {
        "body": "Mars",
        "sign": "Aries",
        "degree": 1.0,
        "house": 6,
        "motion": "retrograde",
        "condition": [
          "domicile"
        ],
        "dignity": [
          "domicile"
        ],
        "rules_houses": [
          1,
          6
        ]
      },
      {
        "body": "Jupiter",
        "sign": "Gemini",
        "degree": 5.4,
        "house": 8,
        "motion": "retrograde",
        "condition": [
          "domicile"
        ],
        "dignity": [
          "domicile"
        ],
        "rules_houses": [
          2,
          5
        ]
      },
      {
        "body": "Saturn",
        "sign": "Sagittarius",
        "degree": 27.6,
        "house": 2,
        "motion": "direct",
        "rules_houses": [
          3,
          4
        ]
      }
    ],
    "aspects": [
      {
        "body_a": "Moon",
        "aspect": "sextile",
        "body_b": "Mercury",
        "notes": "Orb intentionally omitted by source; describe the aspect without ranking it as tight or wide."
      },
      {
        "body_a": "Moon",
        "aspect": "square",
        "body_b": "Venus",
        "orb_degrees": 0.2,
        "notes": "Applying/separating intentionally omitted by source; do not assert whether the contact is building or waning."
      },
      {
        "body_a": "Mars",
        "aspect": "square",
        "body_b": "Saturn",
        "orb_degrees": 3.4,
        "applying": true
      },
      {
        "body_a": "Sun",
        "aspect": "sextile",
        "body_b": "Saturn",
        "orb_degrees": 5.4,
        "applying": true
      }
    ]
  }
}
```
