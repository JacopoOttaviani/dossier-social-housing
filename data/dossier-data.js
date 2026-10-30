/* The Cormoran — Dossier Nº 2 · Social housing in Europe
   Data compiled August 2026, every series rebuilt from its primary source and
   re-checked on 30 September 2026 (see research/FACTCHECK-2026-09-30.md).
   Sources: OECD Affordable Housing Database (PH4.2), Statistik Austria,
   City of Helsinki (Aluesarjat and its 1990–2012 housing report), APUR,
   IBB and the Berlin statistics office, MHCLG live tables 109, 116 and 691,
   Comune di Roma and mapparoma, AFWC.
   City share series: each point is a published measure for that year; the
   lines between points are straight joins. Points listed in `est` are
   estimates and are drawn hollow. */
window.DOSSIER = {
  updated: "November 2026",

  /* ---------- six cities ----------
     sharePath: social housing as % of the city's homes, at the years the
     primary source reports. Measures differ by city and are stated on the
     page: Vienna share of main residences (census 1991–2011, Mikrozensus
     2025); Helsinki ARA rental dwellings; Paris SRU share of main
     residences; Berlin social-rent flats over all dwellings; London council
     plus housing-association dwellings (MHCLG LT109); Rome public housing
     over all dwellings. */
  cities: {
    vienna: {
      label: "Vienna",
      sharePath: { years: [1991, 2001, 2011, 2025], vals: [40.9, 43.0, 42.3, 42] },
      shareNow: 42, shareThen: 40.9, thenYear: 1991, nowYear: 2025,
      stats: [
        ["220,000", "flats owned by the city, which calls itself Europe's largest municipal landlord"],
        ["≈185,000", "flats rented out by limited-profit and co-operative landlords"],
        ["42<small>%</small>", "of Vienna's households rent from the city or a limited-profit landlord"],
        ["4,054", "new subsidised homes approved in 2025, up from about 2,000 in 2022"],
        ["≈1 in 2", "Viennese live in social or subsidised housing, according to the city"]
      ]
    },
    helsinki: {
      label: "Helsinki",
      sharePath: { years: [1990, 1995, 2000, 2005, 2010, 2015, 2020, 2024], vals: [16.5, 17.4, 22.2, 22.3, 21.3, 19.9, 18.3, 16.3] },
      shareNow: 16.3, shareThen: 16.5, thenYear: 1990, nowYear: 2024,
      stats: [
        ["≈55,000", "flats owned by Heka, the city's housing company and Finland's largest landlord"],
        ["1 in 7", "Helsinki residents lives in a Heka flat"],
        ["16<small>%</small>", "of the city's homes are state-subsidised rentals, plus ≈7% with regulated prices or part-buy, part-rent terms"],
        ["80<small>%</small>", "drop in homelessness in Finland, 1987–2023, among people living alone"],
        ["20<small>%</small>", "rise in homelessness in 2025, after cuts to benefits and support services"]
      ]
    },
    paris: {
      label: "Paris",
      sharePath: { years: [2001, 2005, 2011, 2014, 2016, 2020, 2022, 2023, 2024, 2025], vals: [13.4, 14.6, 17.1, 18.5, 19.9, 21.8, 23.3, 23.7, 23.1, 23.2] },
      shareNow: 23.2, shareThen: 13.4, thenYear: 2001, nowYear: 2025,
      stats: [
        ["276,032", "social homes on 1 January 2025"],
        ["23.2<small>%</small>", "of Paris's main homes; the law requires 25%"],
        ["327,000", "households on the waiting list at the end of 2025, 47% of them already Parisian"],
        ["130,316", "social homes funded since 2001, under the SRU law"],
        ["13.4<small>%</small>", "share in 2001; it has grown by nearly three-quarters since, the biggest rise in this dossier"]
      ]
    },
    berlin: {
      label: "Berlin",
      sharePath: { years: [1991, 1995, 2000, 2010, 2015, 2020, 2024], vals: [21.6, 20.2, 14.4, 8.8, 6.4, 4.8, 4.2] },
      shareNow: 4.2, shareThen: 21.6, thenYear: 1991, nowYear: 2024,
      stats: [
        ["85,765", "social-rent flats at the end of 2024, down from 370,861 in 1991"],
        ["200,000+", "city-owned flats sold between 1990 and the mid-2000s"],
        ["8,387", "flats dropped out of the subsidy system in 2025"],
        ["5,175", "new social flats approved for funding in 2025"],
        ["57.6<small>%</small>", "of voters backed taking the biggest landlords' flats into public ownership, 2021"]
      ]
    },
    london: {
      label: "London",
      sharePath: { years: [1991, 1995, 2000, 2005, 2010, 2015, 2020, 2025], vals: [29.2, 27.8, 26.1, 24.0, 23.4, 22.5, 21.5, 21.0] },
      shareNow: 21.0, shareThen: 29.2, thenYear: 1991, nowYear: 2025,
      stats: [
        ["394,591", "council homes in London in 2025, half the 1986 peak of 795,789"],
        ["318,909", "London council homes sold to their tenants under Right to Buy, 1980–2025"],
        ["341,421", "households on London's waiting lists, March 2025, the most since 2013"],
        ["76,020", "London households in temporary accommodation, such as B&amp;Bs and hostels, March 2026"],
        ["2.3×", "the sale price: what Islington paid to buy back 56 homes it had sold under Right to Buy"]
      ]
    },
    rome: {
      label: "Rome",
      /* 2001 is an estimate: ATER's c. 53,000 flats (2006 report) plus the
         city's 24,223 (June 2000) over the 2001 census stock of 1,151,736.
         2019: the mapparoma compilation, 72,327 over 1,264,213 (2011 census). */
      sharePath: { years: [2001, 2019], vals: [6.7, 5.7], est: [0] },
      shareNow: 5.7, shareThen: 6.7, thenYear: 2001, nowYear: 2019,
      stats: [
        ["72,327", "public homes in the city in 2019, 5.7% of all homes"],
        ["45,981", "owned by ATER, the regional housing agency; 22,729 by the city itself"],
        ["≈18,000", "households on the waiting list"],
        ["208", "flats given to households on that list in 2024, about 85 of them from ATER"],
        ["2.6<small>%</small>", "of Italy's homes are public housing; 650,000 households are on city waiting lists"]
      ]
    }
  },

  /* ---------- Europe map: social rental housing, % of total stock ----------
     OECD Affordable Housing Database PH4.2 (2022 or latest), values read from
     the indicator's country data file. Sweden is excluded by the OECD
     definition (rents not sub-market); Greece has no social rental sector. */
  mapCountries: [
    { key: "nl", name: "Netherlands", lat: 52.37, lon: 4.90, share: 34.1, year: 2021, note: "housing associations; defined by rent level, not ownership", focus: true },
    { key: "at", name: "Austria", lat: 48.21, lon: 16.37, share: 23.6, year: 2019, note: "city-owned and limited-profit; main homes only", focus: true },
    { key: "dk", name: "Denmark", lat: 55.68, lon: 12.57, share: 21.3, year: 2022, note: "non-profit housing (almene boliger)" },
    { key: "uk", name: "United Kingdom", lat: 51.51, lon: -0.12, share: 16.4, year: 2022, note: "OECD figure covers England only", focus: true },
    { key: "fr", name: "France", lat: 48.86, lon: 2.35, share: 14.0, year: 2018, note: "HLM, France's social housing", focus: true },
    { key: "ie", name: "Ireland", lat: 53.35, lon: -6.26, share: 12.7, year: 2016, note: "includes dwellings leased from private owners" },
    { key: "fi", name: "Finland", lat: 60.17, lon: 24.94, share: 10.9, year: 2021, note: "state-subsidised (ARA) housing", focus: true },
    { key: "ch", name: "Switzerland", lat: 46.95, lon: 7.45, share: 8.0, year: 2013, note: "includes co-operatives" },
    { key: "pl", name: "Poland", lat: 52.23, lon: 21.01, share: 6.6, year: 2020, note: "municipal stock; 10.1% in 2009" },
    { key: "si", name: "Slovenia", lat: 46.06, lon: 14.51, share: 4.7, year: 2018, note: "" },
    { key: "be", name: "Belgium", lat: 50.85, lon: 4.35, share: 4.2, year: 2018, note: "regional housing companies" },
    { key: "no", name: "Norway", lat: 59.91, lon: 10.75, share: 4.1, year: 2022, note: "municipal dwellings only (~75% of social housing)" },
    { key: "cz", name: "Czechia", lat: 50.09, lon: 14.42, share: 3.6, year: 2021, note: "central-government dwellings only" },
    { key: "hu", name: "Hungary", lat: 47.50, lon: 19.04, share: 2.6, year: 2018, note: "municipal stock" },
    { key: "de", name: "Germany", lat: 52.52, lon: 13.40, share: 2.6, year: 2021, note: "time-limited subsidies; 3.7% in 2011", focus: true },
    { key: "sk", name: "Slovakia", lat: 48.15, lon: 17.11, share: 2.5, year: 2021, note: "municipal stock; 1.6% in 2011" },
    { key: "it", name: "Italy", lat: 41.90, lon: 12.50, share: 2.4, year: 2022, note: "public housing (ERP); 4.2% in 2010. Italian sources give 2.3–2.7% (Federcasa) or 2.6% (Svimez)", focus: true },
    { key: "lv", name: "Latvia", lat: 56.95, lon: 24.11, share: 1.9, year: 2016, note: "" },
    { key: "es", name: "Spain", lat: 40.42, lon: -3.70, share: 1.1, year: 2019, note: "may include other reduced-rent housing, e.g. employer-provided" },
    { key: "ee", name: "Estonia", lat: 59.44, lon: 24.75, share: 1.1, year: 2017, note: "" },
    { key: "pt", name: "Portugal", lat: 38.72, lon: -9.14, share: 1.1, year: 2021, note: "63,217 dwellings — down from 118,334 in 2011" },
    { key: "lt", name: "Lithuania", lat: 54.69, lon: 25.28, share: 0.8, year: 2020, note: "" },
    { key: "is", name: "Iceland", lat: 64.15, lon: -21.94, share: 11.1, year: 2016, offMap: true, note: "outside the map frame; may include student housing" },
    { key: "se", name: "Sweden", lat: 59.33, lon: 18.07, share: null, note: "city-owned housing (allmännyttan) is roughly 16% of homes, but its rents are negotiated rather than below market, so the OECD does not count it" },
    { key: "gr", name: "Greece", lat: 37.98, lon: 23.73, share: null, note: "not in the OECD data: Greece has had no public housing agency since the OEK was abolished in 2012" }
  ],

  /* ---------- comparison: the slope, then → latest ---------- */
  slope: [
    { key: "vienna", then: 40.9, now: 42, thenYear: 1991, nowYear: 2025 },
    { key: "amsterdam", label: "Amsterdam", color: "#9AA69B", muted: true, then: 58, now: 37, thenYear: 1995, nowYear: 2026 },
    { key: "helsinki", then: 16.5, now: 16.3, thenYear: 1990, nowYear: 2024 },
    { key: "paris", then: 13.4, now: 23.2, thenYear: 2001, nowYear: 2025 },
    { key: "london", then: 29.2, now: 21.0, thenYear: 1991, nowYear: 2025 },
    { key: "berlin", then: 21.6, now: 4.2, thenYear: 1991, nowYear: 2024 },
    { key: "rome", then: 6.7, now: 5.7, thenYear: 2001, nowYear: 2019 }
  ]
};
