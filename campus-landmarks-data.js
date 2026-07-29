(function () {
  'use strict';
  const App = (window.ShuttleApp = window.ShuttleApp || {});
  // Coordinate order is [longitude, latitude]. Records without a local coordinate
  // are matched to named OpenStreetMap features inside the KNUST campus envelope.
  App.campusLandmarks = Object.freeze([
  {
    "id": "the-knust-great-hall",
    "name": "The KNUST Great Hall",
    "shortName": "Great Hall",
    "category": "residence",
    "priority": 1,
    "aliases": [
      "The Great Hall",
      "KNUST Great Hall",
      "The older great hall",
      "Great Hall"
    ]
  },
  {
    "id": "prempeh-ii-library",
    "name": "Prempeh II Library",
    "shortName": "Prempeh II Library",
    "category": "academic",
    "priority": 1,
    "aliases": [
      "Prempeh II Library"
    ],
    "coord": [
      -1.573,
      6.67521
    ],
    "coordinateSource": "verified-or-network-anchor"
  },
  {
    "id": "knust-main-administration-block",
    "name": "KNUST Main Administration Block",
    "shortName": "Main Administration",
    "category": "civic",
    "priority": 1,
    "aliases": [
      "Main Administration Block",
      "University Main Administration",
      "University Administration Building",
      "Main Administration"
    ],
    "coord": [
      -1.57136,
      6.67479
    ],
    "coordinateSource": "verified-or-network-anchor"
  },
  {
    "id": "knust-commercial-area",
    "name": "KNUST Commercial Area",
    "shortName": "Commercial Area",
    "category": "academic",
    "priority": 1,
    "aliases": [
      "Commercial Area"
    ],
    "coord": [
      -1.5651,
      6.6748
    ],
    "coordinateSource": "verified-or-network-anchor"
  },
  {
    "id": "jubilee-mall",
    "name": "Jubilee Mall",
    "shortName": "Jubilee Mall",
    "category": "services",
    "priority": 1,
    "aliases": [
      "Jubilee Mall"
    ]
  },
  {
    "id": "bush-canteen",
    "name": "Bush Canteen",
    "shortName": "Bush Canteen",
    "category": "services",
    "priority": 2,
    "aliases": [
      "Bush Canteen"
    ]
  },
  {
    "id": "paa-joe-stadium",
    "name": "Paa Joe Stadium",
    "shortName": "Paa Joe Stadium",
    "category": "recreation",
    "priority": 1,
    "aliases": [
      "Paa Joe Stadium"
    ],
    "coord": [
      -1.56962,
      6.67693
    ],
    "coordinateSource": "verified-or-network-anchor"
  },
  {
    "id": "knust-royal-parade-grounds",
    "name": "KNUST Royal Parade Grounds",
    "shortName": "Royal Parade Grounds",
    "category": "recreation",
    "priority": 1,
    "aliases": [
      "Royal Parade Grounds",
      "Royal Parade Ground"
    ],
    "coord": [
      -1.57339,
      6.67648
    ],
    "coordinateSource": "verified-or-network-anchor"
  },
  {
    "id": "college-of-science",
    "name": "College of Science",
    "shortName": "College of Science",
    "category": "academic",
    "priority": 1,
    "aliases": [
      "College of Science",
      "College of Science Bus Stop"
    ],
    "coord": [
      -1.5674,
      6.6732
    ],
    "coordinateSource": "verified-or-network-anchor"
  },
  {
    "id": "aboagye-menyah-complex",
    "name": "Aboagye Menyah Complex",
    "shortName": "Aboagye Menyah Complex",
    "category": "academic",
    "priority": 2,
    "aliases": [
      "Aboagye Menyah Complex"
    ]
  },
  {
    "id": "college-of-engineering",
    "name": "College of Engineering",
    "shortName": "College of Engineering",
    "category": "academic",
    "priority": 1,
    "aliases": [
      "College of Engineering"
    ]
  },
  {
    "id": "knust-innovation-centre",
    "name": "KNUST Innovation Centre",
    "shortName": "Innovation Centre",
    "category": "academic",
    "priority": 2,
    "aliases": [
      "Innovation Centre"
    ]
  },
  {
    "id": "engineering-gate",
    "name": "Engineering Gate",
    "shortName": "Engineering Gate",
    "category": "transport",
    "priority": 2,
    "aliases": [
      "Engineering Gate"
    ]
  },
  {
    "id": "college-of-humanities-and-social-sciences",
    "name": "College of Humanities and Social Sciences",
    "shortName": "CoHSS",
    "category": "academic",
    "priority": 1,
    "aliases": [
      "College of Humanities and Social Sciences",
      "CoHSS",
      "College of Humanities & Social Sciences"
    ]
  },
  {
    "id": "ccb-auditorium",
    "name": "CCB Auditorium",
    "shortName": "CCB Auditorium",
    "category": "academic",
    "priority": 2,
    "aliases": [
      "CCB Auditorium"
    ]
  },
  {
    "id": "ebenezer-acquaye-building",
    "name": "Ebenezer Acquaye Building",
    "shortName": "Ebenezer Acquaye Building",
    "category": "academic",
    "priority": 2,
    "aliases": [
      "Ebenezer Acquaye Building"
    ]
  },
  {
    "id": "college-of-arts-and-built-environment",
    "name": "College of Arts and Built Environment",
    "shortName": "CABE",
    "category": "academic",
    "priority": 1,
    "aliases": [
      "College of Arts and Built Environment",
      "College of Art and Built Environment",
      "CABE"
    ]
  },
  {
    "id": "college-of-agriculture-and-natural-resources",
    "name": "College of Agriculture and Natural Resources",
    "shortName": "CANR",
    "category": "academic",
    "priority": 1,
    "aliases": [
      "College of Agriculture and Natural Resources",
      "CANR"
    ]
  },
  {
    "id": "faculty-of-pharmacy-and-pharmaceutical-sciences",
    "name": "Faculty of Pharmacy and Pharmaceutical Sciences",
    "shortName": "Pharmacy Faculty",
    "category": "medical",
    "priority": 2,
    "aliases": [
      "Faculty of Pharmacy and Pharmaceutical Sciences",
      "Faculty of Pharmacy",
      "Pharmacy Faculty"
    ]
  },
  {
    "id": "tackie-building",
    "name": "Tackie Building",
    "shortName": "Tackie Building",
    "category": "academic",
    "priority": 2,
    "aliases": [
      "Tackie Building"
    ]
  },
  {
    "id": "school-of-medical-sciences",
    "name": "School of Medical Sciences",
    "shortName": "School of Medical Sciences",
    "category": "medical",
    "priority": 1,
    "aliases": [
      "School of Medical Sciences",
      "KNUST SMS",
      "SMS"
    ],
    "coord": [
      -1.56841,
      6.67231
    ],
    "coordinateSource": "verified-or-network-anchor"
  },
  {
    "id": "casely-hayford-building",
    "name": "Casely-Hayford Building",
    "shortName": "Casely-Hayford Building",
    "category": "academic",
    "priority": 2,
    "aliases": [
      "Casely-Hayford Building",
      "Casely Hayford Building",
      "Casely Hayford"
    ],
    "coord": [
      -1.5601,
      6.6741
    ],
    "coordinateSource": "verified-or-network-anchor"
  },
  {
    "id": "center-for-disability-studies",
    "name": "Center for Disability Studies",
    "shortName": "Center for Disability Studies",
    "category": "academic",
    "priority": 2,
    "aliases": [
      "Center for Disability Studies",
      "Centre for Disability Studies"
    ]
  },
  {
    "id": "tek-credit",
    "name": "TEK Credit",
    "shortName": "TEK Credit",
    "category": "finance",
    "priority": 2,
    "aliases": [
      "TEK Credit",
      "TEK Cooperative Credit Union",
      "Tek Credit"
    ]
  },
  {
    "id": "the-mecca-bridge",
    "name": "The Mecca Bridge",
    "shortName": "The Mecca Bridge",
    "category": "transport",
    "priority": 2,
    "aliases": [
      "The Mecca Bridge",
      "Mecca Bridge"
    ]
  },
  {
    "id": "unity-hall",
    "name": "Unity Hall",
    "shortName": "Unity Hall",
    "category": "residence",
    "priority": 1,
    "aliases": [
      "Unity Hall",
      "Conti",
      "Unity Hall Hostel"
    ],
    "coord": [
      -1.5694,
      6.6761
    ],
    "coordinateSource": "verified-or-network-anchor"
  },
  {
    "id": "university-hall",
    "name": "University Hall",
    "shortName": "University Hall",
    "category": "residence",
    "priority": 1,
    "aliases": [
      "University Hall",
      "Katanga",
      "University Hall Hostel"
    ]
  },
  {
    "id": "republic-hall",
    "name": "Republic Hall",
    "shortName": "Republic Hall",
    "category": "residence",
    "priority": 1,
    "aliases": [
      "Republic Hall"
    ]
  },
  {
    "id": "independence-hall",
    "name": "Independence Hall",
    "shortName": "Independence Hall",
    "category": "residence",
    "priority": 1,
    "aliases": [
      "Independence Hall"
    ]
  },
  {
    "id": "queens-hall",
    "name": "Queens Hall",
    "shortName": "Queens Hall",
    "category": "residence",
    "priority": 1,
    "aliases": [
      "Queens Hall",
      "Queen Elizabeth II Hall",
      "Queen Elizabeth Hall"
    ]
  },
  {
    "id": "africa-hall",
    "name": "Africa Hall",
    "shortName": "Africa Hall",
    "category": "residence",
    "priority": 1,
    "aliases": [
      "Africa Hall"
    ]
  },
  {
    "id": "chancellor-s-hall",
    "name": "Chancellor’s Hall",
    "shortName": "Chancellor’s Hall",
    "category": "residence",
    "priority": 2,
    "aliases": [
      "Chancellor’s Hall",
      "Chancellor's Hall",
      "Chancellors Hall"
    ]
  },
  {
    "id": "old-brunei-hostel",
    "name": "Old Brunei Hostel",
    "shortName": "Old Brunei Hostel",
    "category": "residence",
    "priority": 2,
    "aliases": [
      "Old Brunei Hostel"
    ],
    "coord": [
      -1.5711,
      6.6786
    ],
    "coordinateSource": "verified-or-network-anchor"
  },
  {
    "id": "new-brunei-hostel",
    "name": "New Brunei Hostel",
    "shortName": "New Brunei Hostel",
    "category": "residence",
    "priority": 2,
    "aliases": [
      "New Brunei Hostel"
    ],
    "coord": [
      -1.5707,
      6.6791
    ],
    "coordinateSource": "verified-or-network-anchor"
  },
  {
    "id": "mastercard-foundation-international-hostel",
    "name": "MasterCard Foundation International Hostel",
    "shortName": "MasterCard Hostel",
    "category": "residence",
    "priority": 2,
    "aliases": [
      "MasterCard Foundation International Hostel",
      "Mastercard Foundation International Hostel",
      "MCF International Hostel"
    ]
  },
  {
    "id": "grasag-hostel",
    "name": "GRASAG Hostel",
    "shortName": "GRASAG Hostel",
    "category": "residence",
    "priority": 2,
    "aliases": [
      "GRASAG Hostel",
      "Grasag Hostel"
    ]
  },
  {
    "id": "evandy-hostel",
    "name": "Evandy Hostel",
    "shortName": "Evandy Hostel",
    "category": "residence",
    "priority": 2,
    "aliases": [
      "Evandy Hostel",
      "Ultimate Hostel",
      "Evandy"
    ]
  },
  {
    "id": "gaza-hostel",
    "name": "Gaza Hostel",
    "shortName": "Gaza Hostel",
    "category": "residence",
    "priority": 2,
    "aliases": [
      "Gaza Hostel"
    ],
    "coord": [
      -1.5642,
      6.6645
    ],
    "coordinateSource": "verified-or-network-anchor"
  },
  {
    "id": "knust-botanical-gardens",
    "name": "KNUST Botanical Gardens",
    "shortName": "Botanical Gardens",
    "category": "recreation",
    "priority": 1,
    "aliases": [
      "Botanical Gardens",
      "KNUST Botanical Garden",
      "Botanical Garden"
    ]
  },
  {
    "id": "kyeremateng-park",
    "name": "Kyeremateng Park",
    "shortName": "Kyeremateng Park",
    "category": "recreation",
    "priority": 2,
    "aliases": [
      "Kyeremateng Park"
    ]
  },
  {
    "id": "au-garden",
    "name": "AU Garden",
    "shortName": "AU Garden",
    "category": "recreation",
    "priority": 2,
    "aliases": [
      "AU Garden"
    ]
  },
  {
    "id": "knust-university-hospital",
    "name": "KNUST University Hospital",
    "shortName": "University Hospital",
    "category": "medical",
    "priority": 1,
    "aliases": [
      "University Hospital"
    ]
  },
  {
    "id": "knust-student-clinic",
    "name": "KNUST Student Clinic",
    "shortName": "Student Clinic",
    "category": "medical",
    "priority": 2,
    "aliases": [
      "Student Clinic",
      "KNUST Students' Clinic",
      "KNUST Students Clinic"
    ]
  },
  {
    "id": "opoku-ware-ii-museum",
    "name": "Opoku Ware II Museum",
    "shortName": "Opoku Ware II Museum",
    "category": "academic",
    "priority": 2,
    "aliases": [
      "Opoku Ware II Museum"
    ]
  },
  {
    "id": "medical-village-complex",
    "name": "Medical Village Complex",
    "shortName": "Medical Village Complex",
    "category": "medical",
    "priority": 1,
    "aliases": [
      "Medical Village Complex",
      "Medical Village"
    ],
    "coord": [
      -1.5593,
      6.6582
    ],
    "coordinateSource": "verified-or-network-anchor"
  },
  {
    "id": "kgl-eve-medical-centre",
    "name": "KGL Eve Medical Centre",
    "shortName": "KGL Eve Medical Centre",
    "category": "medical",
    "priority": 2,
    "aliases": [
      "KGL Eve Medical Centre",
      "KGL Eve Medical Center"
    ]
  },
  {
    "id": "rhema-jason-hostel-heights",
    "name": "Rhema Jason Hostel Heights",
    "shortName": "Rhema Jason Heights",
    "category": "residence",
    "priority": 3,
    "aliases": [
      "Rhema Jason Hostel Heights"
    ]
  },
  {
    "id": "covenant-hostel",
    "name": "Covenant Hostel",
    "shortName": "Covenant Hostel",
    "category": "residence",
    "priority": 2,
    "aliases": [
      "Covenant Hostel"
    ]
  },
  {
    "id": "knust-teaching-hospital-project",
    "name": "KNUST Teaching Hospital Project",
    "shortName": "Teaching Hospital Project",
    "category": "medical",
    "priority": 2,
    "aliases": [
      "Teaching Hospital Project"
    ]
  },
  {
    "id": "school-of-public-health",
    "name": "School of Public Health",
    "shortName": "School of Public Health",
    "category": "medical",
    "priority": 2,
    "aliases": [
      "School of Public Health"
    ]
  },
  {
    "id": "laing-building-complex",
    "name": "Laing Building Complex",
    "shortName": "Laing Building Complex",
    "category": "academic",
    "priority": 2,
    "aliases": [
      "Laing Building Complex"
    ]
  },
  {
    "id": "knust-community-centre",
    "name": "KNUST Community Centre",
    "shortName": "Community Centre",
    "category": "civic",
    "priority": 2,
    "aliases": [
      "Community Centre",
      "KNUST Community Center"
    ]
  },
  {
    "id": "senior-staff-club-house",
    "name": "Senior Staff Club House",
    "shortName": "Senior Staff Club House",
    "category": "academic",
    "priority": 2,
    "aliases": [
      "Senior Staff Club House"
    ],
    "coord": [
      -1.57849,
      6.67353
    ],
    "coordinateSource": "verified-or-network-anchor"
  },
  {
    "id": "knust-police-station",
    "name": "KNUST Police Station",
    "shortName": "Police Station",
    "category": "civic",
    "priority": 1,
    "aliases": [
      "Police Station"
    ]
  },
  {
    "id": "knust-poolside",
    "name": "KNUST Poolside",
    "shortName": "Poolside",
    "category": "recreation",
    "priority": 2,
    "aliases": [
      "Poolside",
      "KNUST Swimming Pool"
    ]
  },
  {
    "id": "ayeduase-gate",
    "name": "Ayeduase Gate",
    "shortName": "Ayeduase Gate",
    "category": "transport",
    "priority": 1,
    "aliases": [
      "Ayeduase Gate"
    ]
  },
  {
    "id": "boadi-gate",
    "name": "Boadi Gate",
    "shortName": "Boadi Gate",
    "category": "transport",
    "priority": 1,
    "aliases": [
      "Boadi Gate"
    ]
  },
  {
    "id": "bomso-gate",
    "name": "Bomso Gate",
    "shortName": "Bomso Gate",
    "category": "transport",
    "priority": 1,
    "aliases": [
      "Bomso Gate"
    ]
  },
  {
    "id": "tech-junction-terminal",
    "name": "Tech Junction Terminal",
    "shortName": "Tech Junction Terminal",
    "category": "transport",
    "priority": 1,
    "aliases": [
      "Tech Junction Terminal",
      "Tech Junction",
      "Tech Junction Bus Terminal"
    ]
  },
  {
    "id": "faculty-of-law-building",
    "name": "Faculty of Law Building",
    "shortName": "Faculty of Law Building",
    "category": "academic",
    "priority": 2,
    "aliases": [
      "Faculty of Law Building",
      "Faculty of Law"
    ]
  },
  {
    "id": "allied-health-sciences-block",
    "name": "Allied Health Sciences Block",
    "shortName": "Allied Health Sciences Block",
    "category": "medical",
    "priority": 2,
    "aliases": [
      "Allied Health Sciences Block"
    ]
  },
  {
    "id": "school-of-architecture-block",
    "name": "School of Architecture Block",
    "shortName": "School of Architecture Block",
    "category": "academic",
    "priority": 2,
    "aliases": [
      "School of Architecture Block"
    ]
  },
  {
    "id": "knust-dairy-farm",
    "name": "KNUST Dairy Farm",
    "shortName": "Dairy Farm",
    "category": "academic",
    "priority": 3,
    "aliases": [
      "Dairy Farm"
    ]
  },
  {
    "id": "knust-bakery",
    "name": "KNUST Bakery",
    "shortName": "Bakery",
    "category": "services",
    "priority": 3,
    "aliases": [
      "Bakery"
    ]
  },
  {
    "id": "isaac-aluko-lecture-theatre",
    "name": "Isaac Aluko Lecture Theatre",
    "shortName": "Isaac Aluko Lecture Theatre",
    "category": "academic",
    "priority": 3,
    "aliases": [
      "Isaac Aluko Lecture Theatre"
    ]
  },
  {
    "id": "safo-kantanka-building",
    "name": "Safo Kantanka Building",
    "shortName": "Safo Kantanka Building",
    "category": "academic",
    "priority": 3,
    "aliases": [
      "Safo Kantanka Building"
    ]
  },
  {
    "id": "sms-auditorium",
    "name": "SMS Auditorium",
    "shortName": "SMS Auditorium",
    "category": "academic",
    "priority": 3,
    "aliases": [
      "SMS Auditorium"
    ]
  },
  {
    "id": "gusss-hostels",
    "name": "GUSSS Hostels",
    "shortName": "GUSSS Hostels",
    "category": "residence",
    "priority": 3,
    "aliases": [
      "GUSSS Hostels"
    ]
  },
  {
    "id": "splendor-hostel",
    "name": "Splendor Hostel",
    "shortName": "Splendor Hostel",
    "category": "residence",
    "priority": 3,
    "aliases": [
      "Splendor Hostel"
    ]
  },
  {
    "id": "crystal-rose-hostel",
    "name": "Crystal Rose Hostel",
    "shortName": "Crystal Rose Hostel",
    "category": "residence",
    "priority": 3,
    "aliases": [
      "Crystal Rose Hostel"
    ]
  },
  {
    "id": "standard-chartered-bank-building",
    "name": "Standard Chartered Bank Building",
    "shortName": "Standard Chartered",
    "category": "finance",
    "priority": 3,
    "aliases": [
      "Standard Chartered Bank Building"
    ]
  },
  {
    "id": "ecobank-building",
    "name": "Ecobank Building",
    "shortName": "Ecobank Building",
    "category": "finance",
    "priority": 3,
    "aliases": [
      "Ecobank Building"
    ]
  },
  {
    "id": "gcb-bank-building",
    "name": "GCB Bank Building",
    "shortName": "GCB Bank Building",
    "category": "finance",
    "priority": 3,
    "aliases": [
      "GCB Bank Building"
    ]
  },
  {
    "id": "absa-bank-building",
    "name": "Absa Bank Building",
    "shortName": "Absa Bank Building",
    "category": "finance",
    "priority": 3,
    "aliases": [
      "Absa Bank Building"
    ]
  },
  {
    "id": "calbank-building",
    "name": "CalBank Building",
    "shortName": "CalBank Building",
    "category": "finance",
    "priority": 3,
    "aliases": [
      "CalBank Building"
    ]
  },
  {
    "id": "access-bank-building",
    "name": "Access Bank Building",
    "shortName": "Access Bank Building",
    "category": "finance",
    "priority": 3,
    "aliases": [
      "Access Bank Building"
    ]
  },
  {
    "id": "knust-senior-high-school",
    "name": "KNUST Senior High School",
    "shortName": "Senior High School",
    "category": "academic",
    "priority": 2,
    "aliases": [
      "Senior High School"
    ]
  },
  {
    "id": "knust-primary-and-jhs",
    "name": "KNUST Primary and JHS",
    "shortName": "Primary and JHS",
    "category": "academic",
    "priority": 1,
    "aliases": [
      "Primary and JHS",
      "KNUST Basic School",
      "KSB",
      "KNUST Primary School"
    ],
    "coord": [
      -1.5681,
      6.66909
    ],
    "coordinateSource": "verified-or-network-anchor"
  },
  {
    "id": "vice-chancellor-s-lodge",
    "name": "Vice Chancellor's Lodge",
    "shortName": "Vice Chancellor's Lodge",
    "category": "residence",
    "priority": 3,
    "aliases": [
      "Vice Chancellor's Lodge",
      "Vice-Chancellor's Lodge",
      "Vice Chancellor Lodge"
    ]
  },
  {
    "id": "pro-vice-chancellor-s-residence",
    "name": "Pro-Vice Chancellor's Residence",
    "shortName": "Pro-VC Residence",
    "category": "residence",
    "priority": 3,
    "aliases": [
      "Pro-Vice Chancellor's Residence",
      "Pro Vice Chancellor's Residence",
      "Pro-VC Residence"
    ]
  },
  {
    "id": "registrar-s-residence",
    "name": "Registrar's Residence",
    "shortName": "Registrar's Residence",
    "category": "residence",
    "priority": 3,
    "aliases": [
      "Registrar's Residence",
      "Registrars Residence"
    ]
  },
  {
    "id": "estates-department",
    "name": "Estates Department",
    "shortName": "Estates Department",
    "category": "civic",
    "priority": 3,
    "aliases": [
      "Estates Department"
    ]
  },
  {
    "id": "development-office",
    "name": "Development Office",
    "shortName": "Development Office",
    "category": "civic",
    "priority": 3,
    "aliases": [
      "Development Office"
    ]
  },
  {
    "id": "transport-department",
    "name": "Transport Department",
    "shortName": "Transport Department",
    "category": "civic",
    "priority": 3,
    "aliases": [
      "Transport Department"
    ]
  },
  {
    "id": "knust-fire-station",
    "name": "KNUST Fire Station",
    "shortName": "Fire Station",
    "category": "civic",
    "priority": 2,
    "aliases": [
      "Fire Station"
    ]
  },
  {
    "id": "brunei-junction",
    "name": "Brunei Junction",
    "shortName": "Brunei Junction",
    "category": "transport",
    "priority": 4,
    "aliases": [
      "Brunei Junction"
    ]
  },
  {
    "id": "commercial-area-roundabout",
    "name": "Commercial Area Roundabout",
    "shortName": "Commercial Area Roundabout",
    "category": "transport",
    "priority": 2,
    "aliases": [
      "Commercial Area Roundabout"
    ]
  },
  {
    "id": "main-administration-roundabout",
    "name": "Main Administration Roundabout",
    "shortName": "Admin Roundabout",
    "category": "transport",
    "priority": 2,
    "aliases": [
      "Main Administration Roundabout"
    ]
  },
  {
    "id": "library-roundabout",
    "name": "Library Roundabout",
    "shortName": "Library Roundabout",
    "category": "transport",
    "priority": 2,
    "aliases": [
      "Library Roundabout"
    ]
  },
  {
    "id": "anwomaso-gate",
    "name": "Anwomaso Gate",
    "shortName": "Anwomaso Gate",
    "category": "transport",
    "priority": 1,
    "aliases": [
      "Anwomaso Gate"
    ]
  },
  {
    "id": "bomso-clinic",
    "name": "Bomso Clinic",
    "shortName": "Bomso Clinic",
    "category": "medical",
    "priority": 3,
    "aliases": [
      "Bomso Clinic"
    ]
  },
  {
    "id": "knust-mosque",
    "name": "KNUST Mosque",
    "shortName": "Mosque",
    "category": "worship",
    "priority": 1,
    "aliases": [
      "Mosque",
      "KNUST Islamic Center",
      "KNUST Islamic Centre"
    ]
  },
  {
    "id": "st-peter-s-catholic-chaplaincy",
    "name": "St. Peter’s Catholic Chaplaincy",
    "shortName": "St. Peter’s Catholic Chaplaincy",
    "category": "worship",
    "priority": 3,
    "aliases": [
      "St. Peter’s Catholic Chaplaincy",
      "St. Peter's Catholic Chaplaincy",
      "St Peters Catholic Chaplaincy"
    ]
  },
  {
    "id": "our-lady-of-the-holy-rosary-chaplaincy",
    "name": "Our Lady of the Holy Rosary Chaplaincy",
    "shortName": "Our Lady of the Holy Rosary Chaplaincy",
    "category": "worship",
    "priority": 3,
    "aliases": [
      "Our Lady of the Holy Rosary Chaplaincy"
    ]
  },
  {
    "id": "protestant-chaplaincy",
    "name": "Protestant Chaplaincy",
    "shortName": "Protestant Chaplaincy",
    "category": "worship",
    "priority": 3,
    "aliases": [
      "Protestant Chaplaincy"
    ]
  },
  {
    "id": "de-graft-johnson-auditorium",
    "name": "De-Graft Johnson Auditorium",
    "shortName": "De-Graft Johnson Auditorium",
    "category": "academic",
    "priority": 3,
    "aliases": [
      "De-Graft Johnson Auditorium",
      "De Graft Johnson Auditorium"
    ]
  },
  {
    "id": "kwame-nkrumah-monument",
    "name": "Kwame Nkrumah Monument",
    "shortName": "Kwame Nkrumah Monument",
    "category": "academic",
    "priority": 3,
    "aliases": [
      "Kwame Nkrumah Monument",
      "Dr Kwame Nkrumah Monument",
      "Nkrumah Monument"
    ]
  },
  {
    "id": "independence-hall-quadrangle",
    "name": "Independence Hall Quadrangle",
    "shortName": "Independence Hall Quadrangle",
    "category": "residence",
    "priority": 3,
    "aliases": [
      "Independence Hall Quadrangle"
    ]
  },
  {
    "id": "republic-hall-market",
    "name": "Republic Hall Market",
    "shortName": "Republic Hall Market",
    "category": "residence",
    "priority": 3,
    "aliases": [
      "Republic Hall Market"
    ]
  },
  {
    "id": "unity-hall-twin-towers",
    "name": "Unity Hall Twin Towers",
    "shortName": "Unity Hall Twin Towers",
    "category": "residence",
    "priority": 3,
    "aliases": [
      "Unity Hall Twin Towers",
      "Unity Hall Towers",
      "Conti Towers"
    ]
  },
  {
    "id": "katanga-market",
    "name": "Katanga Market",
    "shortName": "Katanga Market",
    "category": "services",
    "priority": 3,
    "aliases": [
      "Katanga Market"
    ]
  },
  {
    "id": "central-laundry",
    "name": "Central Laundry",
    "shortName": "Central Laundry",
    "category": "services",
    "priority": 3,
    "aliases": [
      "Central Laundry"
    ]
  },
  {
    "id": "maintenance-yard",
    "name": "Maintenance Yard",
    "shortName": "Maintenance Yard",
    "category": "civic",
    "priority": 3,
    "aliases": [
      "Maintenance Yard"
    ]
  },
  {
    "id": "knust-printing-press",
    "name": "KNUST Printing Press",
    "shortName": "Printing Press",
    "category": "services",
    "priority": 3,
    "aliases": [
      "Printing Press"
    ]
  },
  {
    "id": "agric-mechanization-department",
    "name": "Agric Mechanization Department",
    "shortName": "Agric Mechanization",
    "category": "academic",
    "priority": 3,
    "aliases": [
      "Agric Mechanization Department"
    ]
  },
  {
    "id": "horticulture-department",
    "name": "Horticulture Department",
    "shortName": "Horticulture Department",
    "category": "academic",
    "priority": 3,
    "aliases": [
      "Horticulture Department"
    ]
  },
  {
    "id": "geomatic-engineering-block",
    "name": "Geomatic Engineering Block",
    "shortName": "Geomatic Engineering Block",
    "category": "academic",
    "priority": 3,
    "aliases": [
      "Geomatic Engineering Block",
      "Department of Geomatic Engineering"
    ]
  },
  {
    "id": "materials-engineering-block",
    "name": "Materials Engineering Block",
    "shortName": "Materials Engineering Block",
    "category": "academic",
    "priority": 3,
    "aliases": [
      "Materials Engineering Block"
    ]
  },
  {
    "id": "chemical-engineering-block",
    "name": "Chemical Engineering Block",
    "shortName": "Chemical Engineering Block",
    "category": "academic",
    "priority": 3,
    "aliases": [
      "Chemical Engineering Block"
    ]
  },
  {
    "id": "civil-engineering-block",
    "name": "Civil Engineering Block",
    "shortName": "Civil Engineering Block",
    "category": "academic",
    "priority": 3,
    "aliases": [
      "Civil Engineering Block"
    ]
  },
  {
    "id": "electrical-engineering-block",
    "name": "Electrical Engineering Block",
    "shortName": "Electrical Engineering Block",
    "category": "academic",
    "priority": 3,
    "aliases": [
      "Electrical Engineering Block"
    ]
  },
  {
    "id": "mechanical-engineering-block",
    "name": "Mechanical Engineering Block",
    "shortName": "Mechanical Engineering Block",
    "category": "academic",
    "priority": 3,
    "aliases": [
      "Mechanical Engineering Block"
    ]
  },
  {
    "id": "computer-engineering-block",
    "name": "Computer Engineering Block",
    "shortName": "Computer Engineering Block",
    "category": "academic",
    "priority": 3,
    "aliases": [
      "Computer Engineering Block"
    ]
  },
  {
    "id": "physics-department-block",
    "name": "Physics Department Block",
    "shortName": "Physics Department Block",
    "category": "academic",
    "priority": 4,
    "aliases": [
      "Physics Department Block"
    ]
  },
  {
    "id": "chemistry-department-block",
    "name": "Chemistry Department Block",
    "shortName": "Chemistry Department Block",
    "category": "academic",
    "priority": 4,
    "aliases": [
      "Chemistry Department Block"
    ]
  },
  {
    "id": "mathematics-department-block",
    "name": "Mathematics Department Block",
    "shortName": "Mathematics Department Block",
    "category": "academic",
    "priority": 4,
    "aliases": [
      "Mathematics Department Block"
    ]
  },
  {
    "id": "biochemistry-block",
    "name": "Biochemistry Block",
    "shortName": "Biochemistry Block",
    "category": "academic",
    "priority": 3,
    "aliases": [
      "Biochemistry Block"
    ]
  },
  {
    "id": "biological-sciences-block",
    "name": "Biological Sciences Block",
    "shortName": "Biological Sciences Block",
    "category": "academic",
    "priority": 3,
    "aliases": [
      "Biological Sciences Block"
    ]
  },
  {
    "id": "optometry-clinic",
    "name": "Optometry Clinic",
    "shortName": "Optometry Clinic",
    "category": "medical",
    "priority": 3,
    "aliases": [
      "Optometry Clinic",
      "KNUST Optometry Clinic"
    ]
  },
  {
    "id": "ultrasound-centre",
    "name": "Ultrasound Centre",
    "shortName": "Ultrasound Centre",
    "category": "medical",
    "priority": 3,
    "aliases": [
      "Ultrasound Centre",
      "Ultrasound Center"
    ]
  },
  {
    "id": "sms-research-laboratory",
    "name": "SMS Research Laboratory",
    "shortName": "SMS Research Laboratory",
    "category": "medical",
    "priority": 4,
    "aliases": [
      "SMS Research Laboratory"
    ]
  },
  {
    "id": "allied-health-laboratories",
    "name": "Allied Health Laboratories",
    "shortName": "Allied Health Laboratories",
    "category": "medical",
    "priority": 4,
    "aliases": [
      "Allied Health Laboratories"
    ]
  },
  {
    "id": "nurses-quarters",
    "name": "Nurses Quarters",
    "shortName": "Nurses Quarters",
    "category": "medical",
    "priority": 3,
    "aliases": [
      "Nurses Quarters"
    ]
  },
  {
    "id": "medical-village-gate",
    "name": "Medical Village Gate",
    "shortName": "Medical Village Gate",
    "category": "medical",
    "priority": 3,
    "aliases": [
      "Medical Village Gate",
      "Medical Village Entrance"
    ]
  },
  {
    "id": "boadi-enclave-market",
    "name": "Boadi Enclave Market",
    "shortName": "Boadi Enclave Market",
    "category": "services",
    "priority": 3,
    "aliases": [
      "Boadi Enclave Market"
    ]
  },
  {
    "id": "asuogya-road-checkpoint",
    "name": "Asuogya Road Checkpoint",
    "shortName": "Asuogya Road Checkpoint",
    "category": "transport",
    "priority": 4,
    "aliases": [
      "Asuogya Road Checkpoint"
    ]
  },
  {
    "id": "duncanson-road-roundabout",
    "name": "Duncanson Road Roundabout",
    "shortName": "Duncanson Road Roundabout",
    "category": "transport",
    "priority": 3,
    "aliases": [
      "Duncanson Road Roundabout"
    ]
  },
  {
    "id": "ayeduase-road-hub",
    "name": "Ayeduase Road Hub",
    "shortName": "Ayeduase Road Hub",
    "category": "transport",
    "priority": 4,
    "aliases": [
      "Ayeduase Road Hub"
    ]
  },
  {
    "id": "mango-road-transit-stop",
    "name": "Mango Road Transit Stop",
    "shortName": "Mango Road Transit Stop",
    "category": "transport",
    "priority": 3,
    "aliases": [
      "Mango Road Transit Stop"
    ]
  },
  {
    "id": "buroburo-road-junction",
    "name": "Buroburo Road Junction",
    "shortName": "Buroburo Road Junction",
    "category": "transport",
    "priority": 4,
    "aliases": [
      "Buroburo Road Junction"
    ]
  },
  {
    "id": "queens-road-junction",
    "name": "Queens Road Junction",
    "shortName": "Queens Road Junction",
    "category": "transport",
    "priority": 4,
    "aliases": [
      "Queens Road Junction"
    ]
  },
  {
    "id": "ahemfo-avenue-transit-corner",
    "name": "Ahemfo Avenue Transit Corner",
    "shortName": "Ahemfo Transit Corner",
    "category": "transport",
    "priority": 4,
    "aliases": [
      "Ahemfo Avenue Transit Corner"
    ]
  }
]);
})();
