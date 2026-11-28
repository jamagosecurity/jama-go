export interface MarketingFeature {
  title: string;
  text: string;
  href?: string;
}

export interface MarketingStep {
  title: string;
  text: string;
}

export interface MarketingFaq {
  question: string;
  answer: string;
}

export type MarketingTheme = 'gold' | 'blue' | 'teal' | 'red' | 'violet' | 'copper' | 'cyan' | 'olive';
export type MarketingLayout = 'editorial' | 'reverse' | 'centered' | 'compact';

export interface MarketingPageContent {
  key: string;
  theme: MarketingTheme;
  layout?: MarketingLayout;
  eyebrow: string;
  title: string;
  accent: string;
  description: string;
  highlights: string[];
  overviewTitle: string;
  overviewText: string;
  features: MarketingFeature[];
  steps: MarketingStep[];
  detailText: string;
  checklist: string[];
  related: { href: string; label: string; text: string }[];
  faqs: MarketingFaq[];
}

export const MARKETING_PAGES: Record<string, MarketingPageContent> = {
  'why-us': {
    key: 'why-us', theme: 'gold', eyebrow: 'Why Jama Go',
    title: 'One team.', accent: 'Every detail accounted for.',
    description: 'From the first walk-through to the support call after handover, the same Jama Go team stays close to your site, your system, and your priorities.',
    highlights: ['Showroom on Salwa Road', 'MOI-SSD approved contractor', 'Direct 24/7 support line'],
    overviewTitle: 'Confidence comes from knowing who is responsible.',
    overviewText: 'We keep design, equipment, installation, approval, and aftercare connected. You spend less time coordinating suppliers and more time with a system that simply works.',
    features: [
      { title: 'A recommendation you can understand', text: 'We explain camera positions, equipment choices, storage, and costs in plain language, with brand and model details on every quotation line.' },
      { title: 'Installation treated as a craft', text: 'Cable routes, mounting, configuration, labelling, and handover are approached with the same care as the equipment itself.' },
      { title: 'A relationship beyond handover', text: 'Remote viewing help, user changes, planned maintenance, and urgent support all come from the team that already knows your site.' },
    ],
    steps: [
      { title: 'We listen first', text: 'Your concerns, daily routines, site constraints, and future plans shape the brief before equipment is discussed.' },
      { title: 'We make it clear', text: 'You receive a considered design and itemised proposal, with options explained rather than hidden in packages.' },
      { title: 'We stay accountable', text: 'Installation, testing, approval where needed, training, and support remain connected to one responsible team.' },
    ],
    detailText: 'Premium service is not about adding complexity. It is about removing uncertainty: one site survey, one coherent design, one clear proposal, and one number to call afterwards.',
    checklist: ['Direct access to our Doha team', 'Equipment selected for the site—not a preset bundle', 'Documentation and handover your team can use'],
    related: [
      { href: '/about/company', label: 'About Jama Go', text: 'Meet the company and the way we work.' },
      { href: '/about/results', label: 'Our results', text: 'See the outcomes we design every project around.' },
    ],
    faqs: [
      { question: 'Will I deal with different suppliers for installation and support?', answer: 'No. Jama Go surveys, specifies, installs, documents, and supports the system as one connected service. Where MOI-SSD approval is required, we also coordinate the related drawings, storage calculation, installation, and inspection journey.' },
      { question: 'Can I compare equipment before choosing?', answer: 'Yes. Visit our Salwa Road showroom to discuss and try available equipment. Your quotation also identifies the proposed brands and models so you can make an informed comparison.' },
    ],
  },
  company: {
    key: 'company', theme: 'blue', eyebrow: 'About us',
    title: 'Security expertise,', accent: 'rooted in Qatar.',
    description: 'Jama Go Security Equipment is a Doha security systems company with a showroom on Salwa Road and teams serving homes, businesses, and approval-regulated sites across Qatar.',
    highlights: ['Doha-based security specialists', 'Systems supplied and installed', 'Nationwide survey and service'],
    overviewTitle: 'A security partner built around the whole journey.',
    overviewText: 'Our work spans CCTV, access control, alarms, intercoms, gate automation, smart systems, networks, and maintenance. The common thread is practical, well-documented delivery.',
    features: [
      { title: 'A local point of contact', text: 'Our Salwa Road showroom gives you a real place to discuss your project, see equipment, and sit down with the team.' },
      { title: 'Technical and approval knowledge', text: 'We design for everyday usability and, where required, the drawings, recording storage, and documentation needed for MOI-SSD projects.' },
      { title: 'Qatar-wide coverage', text: 'From Doha and Lusail to Al Khor, Al Wakrah, Mesaieed, Dukhan, and Ras Laffan, we survey and service sites nationwide.' },
    ],
    steps: [
      { title: 'Understand the environment', text: 'We look at the building, the people who use it, the risks, and the operational needs behind the request.' },
      { title: 'Engineer the complete system', text: 'Equipment, coverage, connectivity, recording, access, and future maintenance are considered together.' },
      { title: 'Deliver and support locally', text: 'Our team installs, tests, hands over, and remains available for assistance and planned care.' },
    ],
    detailText: 'Being local means more than an address. It means understanding how sites in Qatar operate, being available for a visit, and building systems around real conditions rather than distant assumptions.',
    checklist: ['Unit 41, Al Ain Complex, Salwa Road, Doha', 'Residential, commercial, retail, and MOI-regulated environments', 'One team for supply, installation, approval, and AMC'],
    related: [
      { href: '/about/why-us', label: 'Why Jama Go', text: 'The principles behind our service.' },
      { href: '/contact', label: 'Visit our showroom', text: 'Directions, opening hours, and contact details.' },
    ],
    faqs: [
      { question: 'Where is Jama Go based?', answer: 'Our showroom is at Unit 41, Zone 56, Street 340, Building 349, Al Ain Complex, Salwa Road, Doha, Qatar. The Contact page includes live directions and current opening hours.' },
      { question: 'Do you work outside Doha?', answer: 'Yes. We survey, install, and maintain systems across Qatar, including Lusail, Al Khor, Al Wakrah, Mesaieed, Dukhan, and Ras Laffan. Share your site location and we will arrange the appropriate visit.' },
    ],
  },
  results: {
    key: 'results', theme: 'teal', eyebrow: 'Our results',
    title: 'Measured by what', accent: 'works after we leave.',
    description: 'Our most important results are practical: clear visibility, controlled access, complete documentation, confident users, and support that remains reachable.',
    highlights: ['Approval-ready documentation', 'Usable systems at handover', 'Long-term support available'],
    overviewTitle: 'Outcomes you can see on site—not inflated numbers.',
    overviewText: 'We do not publish invented project counts or ratings. Instead, we focus on tangible deliverables that can be checked during handover and throughout the life of the system.',
    features: [
      { title: 'Coverage with a purpose', text: 'Each camera, reader, sensor, or intercom point has a defined role tied to movement, risk, and the way the site operates.' },
      { title: 'A handover your team understands', text: 'Testing, remote viewing, user guidance, and system documentation help your team use the installation confidently from day one.' },
      { title: 'Support that preserves the result', text: 'Technical assistance and maintenance help keep recording, access, connectivity, and user settings aligned with your changing needs.' },
    ],
    steps: [
      { title: 'Define success together', text: 'We agree what the system needs to show, restrict, record, alert, or simplify before designing it.' },
      { title: 'Test against the brief', text: 'Coverage, playback, access rules, alerts, connectivity, and user workflows are checked before handover.' },
      { title: 'Keep it performing', text: 'Support and optional planned maintenance address changes, wear, settings, and emerging issues over time.' },
    ],
    detailText: 'Every project produces concrete evidence of completion: an installed and tested system, an itemised record of what was supplied, user guidance, and MOI-SSD documentation where the site requires it.',
    checklist: ['System tested against the agreed design', 'Clear handover for the people using it', 'A direct route to technical help afterwards'],
    related: [
      { href: '/projects/moi', label: 'MOI projects', text: 'See the approval-focused delivery journey.' },
      { href: '/projects/non-moi', label: 'Non-MOI projects', text: 'Explore residential and commercial delivery.' },
    ],
    faqs: [
      { question: 'Why are there no project totals or client ratings here?', answer: 'We only want to publish verified figures. Until the company supplies an audited project count or rating, this page focuses on the real deliverables and service standards you can expect instead of presenting made-up numbers.' },
      { question: 'What do we receive at handover?', answer: 'The exact documentation depends on the system, but the handover can include equipment details, configuration and user guidance, tested remote viewing, and MOI-SSD-related drawings or storage documentation where applicable.' },
    ],
  },
  'cctv-surveillance': {
    key: 'cctv-surveillance', theme: 'blue', eyebrow: 'CCTV surveillance',
    title: 'Every important detail,', accent: 'clearly in view.',
    description: 'HD and 4K IP camera systems designed around your entrances, movement, blind spots, lighting, recording needs, and the way you want to view footage.',
    highlights: ['HD and 4K IP cameras', 'Remote viewing on your phone', 'Recording designed around retention'],
    overviewTitle: 'A camera system begins with coverage—not camera count.',
    overviewText: 'We map what you need to see and why, then choose the form factor, lens, recorder, storage, and network around that plan.',
    features: [
      { title: 'Purposeful camera planning', text: 'Entrances, perimeters, reception areas, stock rooms, parking, and blind spots are assessed for identification, overview, or deterrence.' },
      { title: 'Recording and remote access', text: 'Recorders, hard drives, playback, secure remote viewing, and user access are configured as one dependable viewing experience.' },
      { title: 'Brands matched to the brief', text: 'We work with established manufacturers including Hikvision, Dahua, Axis, Bosch, Uniview, and others, selected by requirement and budget.' },
    ],
    steps: [
      { title: 'Survey and coverage map', text: 'We walk the site, review lighting and movement, and mark the views that matter.' },
      { title: 'Design and itemised proposal', text: 'Camera models, recording, storage, network requirements, installation, and costs are presented clearly.' },
      { title: 'Install, view, and verify', text: 'We mount, cable, configure, test recording and playback, and set up remote viewing with your users.' },
    ],
    detailText: 'Good surveillance balances visibility with usability. We consider resolution, lens angle, night performance, recording days, network load, playback, and who needs access before selecting equipment.',
    checklist: ['Camera layout based on actual site conditions', 'Storage sized around your recording requirement', 'Playback and mobile viewing tested with you'],
    related: [
      { href: '/solutions/cctv-drawings', label: 'CCTV drawings', text: 'Turn the coverage plan into clear documentation.' },
      { href: '/cameras', label: 'Camera catalogue', text: 'Browse currently available camera models.' },
    ],
    faqs: [
      { question: 'Do I need 4K cameras everywhere?', answer: 'Not necessarily. Resolution is only one part of identification. Lens choice, distance, lighting, positioning, and recording settings also matter. We may recommend different camera types for overview and detail views rather than one specification everywhere.' },
      { question: 'Can I watch my cameras when I am away?', answer: 'Yes, where the recorder and site internet connection support remote access. We configure and test the appropriate mobile viewing workflow and explain user access and password care during handover.' },
    ],
  },
  'access-control': {
    key: 'access-control', theme: 'gold', eyebrow: 'Access control',
    title: 'The right people.', accent: 'The right doors.',
    description: 'Card, fingerprint, and face readers, magnetic locks, controllers, and time attendance shaped around your doors, users, schedules, and security policies.',
    highlights: ['Card and biometric options', 'Door and user permissions', 'Time attendance available'],
    overviewTitle: 'Control access without complicating everyday movement.',
    overviewText: 'A useful access system reflects how your site actually works: staff, residents, visitors, managers, cleaners, contractors, and emergency requirements all need consideration.',
    features: [
      { title: 'Credentials for each environment', text: 'Choose card, PIN, fingerprint, face, or combined readers according to convenience, user volume, and the level of control required.' },
      { title: 'Permissions with a clear structure', text: 'Door groups, schedules, user roles, and temporary access can be organised around your operating policies.' },
      { title: 'Attendance and reporting', text: 'Where required, time attendance and event records help authorised managers review movement and working patterns.' },
    ],
    steps: [
      { title: 'Door and user assessment', text: 'We review door construction, traffic, existing locks, user groups, and the desired access rules.' },
      { title: 'System and permission design', text: 'Readers, locks, controllers, power, egress, software, and schedules are specified together.' },
      { title: 'Installation and user setup', text: 'We install, enrol initial users, test access and release behavior, and show your administrators how to manage the system.' },
    ],
    detailText: 'Access control is about more than opening a door. We account for lock compatibility, power, emergency release, visitor flow, credential management, and the daily tasks your administrators will perform.',
    checklist: ['Door-by-door equipment recommendation', 'User groups and schedules planned with you', 'Administrator training and handover'],
    related: [
      { href: '/solutions/smart-door-locks', label: 'Smart door locks', text: 'Connected locking for homes and smaller sites.' },
      { href: '/solutions/intercom-systems', label: 'Intercom systems', text: 'See and speak with visitors before granting entry.' },
    ],
    faqs: [
      { question: 'Can access control work with my existing doors?', answer: 'Many existing doors can be upgraded, but the frame, leaf, current locking hardware, and wiring route need inspection. The free survey lets us confirm compatible readers, locks, and any making-good or door work required.' },
      { question: 'What happens when a card or user leaves?', answer: 'Authorised administrators can disable the credential or remove the user according to the chosen platform. We show your team how to handle joiners, leavers, replacements, and temporary permissions.' },
    ],
  },
  'intruder-alarms': {
    key: 'intruder-alarms', theme: 'red', eyebrow: 'Intruder alarms',
    title: 'Immediate awareness.', accent: 'When every second matters.',
    description: 'Door, motion, and glass-break detection with sirens, zones, keypads, and mobile alerts designed around the vulnerable points of your property.',
    highlights: ['Door and motion detection', 'Glass-break and perimeter sensors', 'Sirens and instant alerts'],
    overviewTitle: 'Detection designed to notice the unusual—not interrupt the ordinary.',
    overviewText: 'Sensor placement, entry routes, pets, airflow, daily movement, and user habits all influence a dependable alarm design.',
    features: [
      { title: 'Layered intrusion detection', text: 'Door contacts, motion sensors, glass-break detectors, and other devices can protect perimeter and interior zones.' },
      { title: 'Alerts people can act on', text: 'Sirens, keypad notifications, and supported mobile alerts make alarm events visible to the people who need to respond.' },
      { title: 'Simple everyday operation', text: 'Arming, disarming, user codes, zones, and entry delays are configured around the people using the site.' },
    ],
    steps: [
      { title: 'Risk and movement survey', text: 'We identify entry points, internal movement, environmental factors, and the response you expect.' },
      { title: 'Zone and device design', text: 'Sensors, zones, keypad locations, alerting, and user controls are planned to reduce blind spots and nuisance triggers.' },
      { title: 'Install and scenario-test', text: 'We test detection, alerts, entry and exit behavior, and show users how to operate the alarm confidently.' },
    ],
    detailText: 'Alarm reliability comes from careful placement and commissioning. We consider sunlight, air conditioning, pets, storage layouts, vibration, and user routines before fixing device positions.',
    checklist: ['Zones labelled in language your team understands', 'Entry and exit delays matched to daily use', 'Alarm and alert scenarios tested at handover'],
    related: [
      { href: '/services/cctv-surveillance', label: 'CCTV surveillance', text: 'Add visual verification to alarm events.' },
      { href: '/services/amc-maintenance', label: 'AMC & maintenance', text: 'Keep sensors, power, and alerts checked.' },
    ],
    faqs: [
      { question: 'Can an alarm be designed around pets?', answer: 'Often, yes. The answer depends on the animal, room layout, sensor technology, height, and lens selection. Tell us about pets during the survey so detection can be planned around their normal movement.' },
      { question: 'Can I receive alerts on my phone?', answer: 'Supported panels and communicators can send mobile alerts when configured with the required connectivity. We will explain the available notification types and any communication dependencies for your selected system.' },
    ],
  },
  'gate-barriers': {
    key: 'gate-barriers', theme: 'gold', eyebrow: 'Gate barriers',
    title: 'Controlled entry.', accent: 'Smooth, deliberate flow.',
    description: 'Vehicle barriers and pedestrian entrance solutions for car parks, compounds, offices, and commercial sites, designed around traffic, safety, and access rules.',
    highlights: ['Vehicle access management', 'Car parks and compounds', 'Integrated entry controls'],
    overviewTitle: 'Make every arrival easier to manage.',
    overviewText: 'Barrier performance depends on traffic patterns, lane geometry, duty cycle, safety devices, driver behavior, and the credentials used to grant entry.',
    features: [
      { title: 'Vehicle barrier systems', text: 'Barrier cabinets, arms, motors, and control methods selected for lane width, usage, and site conditions.' },
      { title: 'Entry and exit integration', text: 'Remote controls, cards, readers, intercoms, loop detectors, and other triggers can be combined around the arrival process.' },
      { title: 'Safety considered from the start', text: 'Detection, obstacle response, manual operation, and safe positioning are assessed alongside convenience and control.' },
    ],
    steps: [
      { title: 'Traffic and lane survey', text: 'We measure the entrance, observe movement, and discuss peak flow, visitors, residents, staff, and service vehicles.' },
      { title: 'Barrier and control design', text: 'Equipment, safety detection, credentials, intercom, power, and manual fallback are specified as one entrance system.' },
      { title: 'Install and cycle-test', text: 'We commission movement, access triggers, safety response, and user procedures through repeated real-world scenarios.' },
    ],
    detailText: 'A barrier should manage traffic without creating a new problem at the gate. We look at queuing, turning space, tailgating risks, delivery access, emergency release, and daily operation.',
    checklist: ['Lane layout and duty cycle assessed', 'Entry and exit methods agreed with you', 'Safety and manual operation demonstrated'],
    related: [
      { href: '/solutions/speed-gates-turnstiles', label: 'Speed gates & turnstiles', text: 'Manage pedestrian access in lobbies and entrances.' },
      { href: '/solutions/intercom-systems', label: 'Intercom systems', text: 'Add visitor communication at the gate.' },
    ],
    faqs: [
      { question: 'Can a barrier work with my existing access system?', answer: 'Integration is often possible when the existing controller provides a compatible trigger or relay interface. We inspect the current equipment and entrance before confirming the safest connection method.' },
      { question: 'How is a barrier operated during a power or equipment fault?', answer: 'The fallback depends on the selected equipment. Options can include backup power and controlled manual release. We include the appropriate procedure in handover so authorised staff know what to do.' },
    ],
  },
  'moi-ssd-approval': {
    key: 'moi-ssd-approval', theme: 'red', eyebrow: 'MOI-SSD approval',
    title: 'Approval-ready CCTV.', accent: 'From the first drawing.',
    description: 'Camera planning, drawings, recording storage calculations, installation, and inspection support connected in one MOI-SSD project journey.',
    highlights: ['MOI-SSD approved contractor', 'Drawings and storage calculations', 'Installation through inspection'],
    overviewTitle: 'Compliance works better when it shapes the design from day one.',
    overviewText: 'For sites that require Ministry of Interior approval, we connect the camera layout, equipment, recording requirement, documentation, installation, and inspection instead of treating paperwork as a final step.',
    features: [
      { title: 'CCTV drawings and coverage planning', text: 'Camera positions, types, coverage intent, and system information are documented so the installation has a clear reference.' },
      { title: 'Recording storage calculation', text: 'Camera quantities, recording parameters, retention requirements, and drive capacity are considered together before equipment is finalised.' },
      { title: 'Inspection-connected delivery', text: 'The approved design guides installation and handover, helping the physical system and submitted documentation stay aligned.' },
    ],
    steps: [
      { title: 'Survey and approval brief', text: 'We confirm the site category, coverage expectations, recording needs, and approval pathway.' },
      { title: 'Drawing and storage package', text: 'The CCTV layout and recording calculation are prepared for review before installation proceeds.' },
      { title: 'Install, inspect, and hand over', text: 'We install to the agreed design, support the inspection process, and close out the project documentation.' },
    ],
    detailText: 'An approval-ready project is a chain of consistent decisions. Changing camera count, model, recording settings, or retention late in the process can affect the whole package, so we keep those choices connected.',
    checklist: ['Site-specific CCTV documentation', 'Storage aligned with recording requirements', 'One team following the project through inspection'],
    related: [
      { href: '/solutions/cctv-drawings', label: 'CCTV drawings', text: 'Explore the design documentation in detail.' },
      { href: '/projects/moi', label: 'MOI project delivery', text: 'See how the complete project is managed.' },
    ],
    faqs: [
      { question: 'Does every CCTV project need MOI-SSD approval?', answer: 'No. Requirements depend on the site and its category. We first establish whether your property falls within an approval-regulated scope, then explain the appropriate process for your project.' },
      { question: 'Can you review an existing CCTV design?', answer: 'Yes. Share the current drawings, camera schedule, recorder details, and retention requirement if available. We can identify what needs to be aligned before recommending changes or proceeding with installation.' },
    ],
  },
  'installation-maintenance': {
    key: 'installation-maintenance', theme: 'blue', eyebrow: 'Installation & maintenance',
    title: 'Installed with care.', accent: 'Kept performing.',
    description: 'Professional installation, configuration, testing, repairs, and practical aftercare for security and low-current systems across Qatar.',
    highlights: ['Neat, structured installation', 'Testing before handover', 'Repairs and technical aftercare'],
    overviewTitle: 'The quality you see—and the reliability you do not have to think about.',
    overviewText: 'Mounting, cabling, terminations, power, network settings, software, and user training all influence whether a system remains easy to use.',
    features: [
      { title: 'Considered physical installation', text: 'Equipment positions, mounting, cable routes, containment, labelling, and finishes are planned around the building.' },
      { title: 'Complete technical commissioning', text: 'Power, connectivity, recording, access rules, alerts, apps, and user workflows are configured and tested together.' },
      { title: 'Responsive corrective support', text: 'When equipment or settings stop behaving as expected, we investigate the full chain rather than treating only the visible symptom.' },
    ],
    steps: [
      { title: 'Prepare the site and system', text: 'We confirm positions, access, cabling, power, network readiness, and the installation sequence.' },
      { title: 'Install and configure', text: 'Hardware and software are completed with attention to safety, finish, naming, and future serviceability.' },
      { title: 'Test, explain, and support', text: 'We test real user scenarios, hand over the system, and provide a route for later technical assistance.' },
    ],
    detailText: 'A neat installation is also a maintainable one. Accessible equipment, understandable labels, sensible cable routes, and documented settings make future changes and fault finding significantly easier.',
    checklist: ['Installation planned around your operations', 'Real workflows tested before sign-off', 'Clear support route for later issues'],
    related: [
      { href: '/services/amc-maintenance', label: 'AMC services', text: 'Add planned visits and ongoing system care.' },
      { href: '/support', label: 'Technical support', text: 'Get help with an existing system.' },
    ],
    faqs: [
      { question: 'Can you repair a system installed by someone else?', answer: 'We can assess it first. Share the symptoms and available equipment details, then arrange a visit if needed. We will check the equipment, power, network, configuration, and physical condition before recommending a repair.' },
      { question: 'Will installation interrupt our business?', answer: 'We plan the work around your operations and agree access times, noisy tasks, downtime, and areas that must remain available. The survey is the right time to identify any phased or out-of-hours requirements.' },
    ],
  },
  'amc-maintenance': {
    key: 'amc-maintenance', theme: 'teal', eyebrow: 'AMC services',
    title: 'Prevention before', accent: 'the urgent call.',
    description: 'Annual maintenance contracts with planned system checks, practical technical assistance, and a familiar team to call when something needs attention.',
    highlights: ['Planned preventive visits', '24/7 urgent support line', 'System history with one team'],
    overviewTitle: 'Protect the investment your site depends on.',
    overviewText: 'A security system can look normal while a drive, camera, power supply, battery, network connection, or user setting is quietly compromising its usefulness.',
    features: [
      { title: 'Planned preventive checks', text: 'Visits focus on the complete operating chain: devices, recording, storage, power, connectivity, remote access, and visible condition.' },
      { title: 'Configuration and user assistance', text: 'Routine support can cover remote viewing, user changes, passwords, settings, and guidance for the people operating the system.' },
      { title: 'A clear path for faults', text: 'Issues are assessed, explained, and prioritised so you understand what needs adjustment, repair, replacement, or further investigation.' },
    ],
    steps: [
      { title: 'Baseline the system', text: 'We record the installed equipment, current condition, known issues, and the site’s support priorities.' },
      { title: 'Agree the care plan', text: 'Visit scope, contact routes, response expectations, and any exclusions are set out clearly in the AMC.' },
      { title: 'Check, advise, and maintain', text: 'Planned visits and support requests build a useful picture of system health and recurring needs over time.' },
    ],
    detailText: 'Maintenance is most valuable before an incident. Checking playback, available storage, recording continuity, power, and connectivity helps uncover problems while there is still time to act calmly.',
    checklist: ['AMC scope written around your actual system', 'Preventive checks—not only reactive call-outs', 'Clear advice on corrective work and replacements'],
    related: [
      { href: '/support', label: 'Support options', text: 'Choose the right route for urgent or routine help.' },
      { href: '/journal/amc-value', label: 'Why maintenance matters', text: 'Read our practical guide to system care.' },
    ],
    faqs: [
      { question: 'What does an AMC include?', answer: 'The agreed scope depends on your installed system and site. It can include planned inspections, technical assistance, configuration help, and fault assessment. Parts, replacements, and response terms should be stated explicitly in your contract.' },
      { question: 'Can you take over maintenance of an existing system?', answer: 'Yes, after an initial assessment. We need to understand the equipment, current condition, access details, and any existing faults before defining the appropriate AMC scope and bringing the system into a care plan.' },
    ],
  },
  'smart-home-automation': {
    key: 'smart-home-automation', theme: 'gold', eyebrow: 'Smart home & automation',
    title: 'Your home,', accent: 'in quiet harmony.',
    description: 'Smart locks, lighting, home automation, and connected security brought together around the way you live—not a collection of disconnected apps.',
    highlights: ['Connected security and access', 'Lighting and home automation', 'Control from your phone'],
    overviewTitle: 'Technology that makes the home feel simpler.',
    overviewText: 'We start with routines, preferences, and practical control, then choose the devices and integrations that can support them reliably.',
    features: [
      { title: 'Security that stays connected', text: 'Compatible locks, cameras, sensors, intercoms, and alerts can be coordinated into a more understandable home experience.' },
      { title: 'Lighting and everyday scenes', text: 'Lighting and supported devices can be arranged around arrival, evening, away, and other routines that matter to your household.' },
      { title: 'Control made understandable', text: 'App access, household users, manual controls, and everyday operation are explained so the technology remains approachable.' },
    ],
    steps: [
      { title: 'Map your routines', text: 'We discuss arrival, sleep, entertaining, travel, family access, and the tasks you want to simplify.' },
      { title: 'Choose a coherent ecosystem', text: 'Devices, connectivity, control methods, and expansion options are selected to work together.' },
      { title: 'Install and personalise', text: 'We configure devices, scenes, household access, and manual fallbacks, then walk through everyday use with you.' },
    ],
    detailText: 'Automation should never make basic living harder. We preserve intuitive wall controls and manual options where appropriate, while considering Wi-Fi coverage, internet dependency, household permissions, and future additions.',
    checklist: ['Scenes based on real household routines', 'Manual and remote operation considered together', 'Users and permissions set up with you'],
    related: [
      { href: '/solutions/smart-door-locks', label: 'Smart door locks', text: 'Make everyday entry more convenient.' },
      { href: '/solutions/internet-wifi', label: 'Internet & Wi-Fi', text: 'Build a stronger connected-home foundation.' },
    ],
    faqs: [
      { question: 'Can smart home features work with my existing devices?', answer: 'It depends on the brand, protocol, model, and current control platform. Bring a list or photos of your existing devices to the survey and we will identify what can remain, integrate, or need replacement.' },
      { question: 'What happens if the internet goes down?', answer: 'That depends on the chosen ecosystem. We distinguish between features that can continue locally and those requiring cloud access, and we plan sensible manual controls for essential functions.' },
    ],
  },
  'intercom-systems': {
    key: 'intercom-systems', theme: 'blue', eyebrow: 'Intercom systems',
    title: 'Know who is there.', accent: 'Before you open the door.',
    description: 'Video and audio intercoms for villas, apartments, buildings, and compounds, with indoor answering, door release, and remote options where supported.',
    highlights: ['Video and audio calling', 'Villa and multi-unit options', 'Integrated door release'],
    overviewTitle: 'A more confident welcome for every visitor.',
    overviewText: 'Entrance position, call routing, number of homes, answering points, locking hardware, and network availability determine the right intercom design.',
    features: [
      { title: 'Villa video intercoms', text: 'See and speak with visitors from an indoor monitor or supported mobile device, with door or gate release where required.' },
      { title: 'Building and compound systems', text: 'Multi-unit calling, apartment monitors, directories, and entrance panels organised around residents and building management.' },
      { title: 'Connected entry workflows', text: 'Intercoms can be coordinated with electric locks, gate controls, access readers, and other entry equipment.' },
    ],
    steps: [
      { title: 'Entrance and user survey', text: 'We review gates, doors, call destinations, resident or family needs, locking, and cable routes.' },
      { title: 'Call and release design', text: 'Panels, monitors, mobile access, unlocking, network, and expansion needs are specified together.' },
      { title: 'Install and test every call', text: 'Audio, video, call routing, release, and remote functions are checked with the people who will use them.' },
    ],
    detailText: 'The best intercom is the one everyone can answer confidently. We consider screen placement, visitor visibility at night, hearing and speech clarity, family or resident access, and how the door should be released.',
    checklist: ['Entrance and answering points planned', 'Door or gate release tested safely', 'Resident and mobile users guided'],
    related: [
      { href: '/services/access-control', label: 'Access control', text: 'Add managed credentials and door permissions.' },
      { href: '/solutions/smart-door-locks', label: 'Smart door locks', text: 'Explore connected entry for homes.' },
    ],
    faqs: [
      { question: 'Can I answer my intercom when I am not home?', answer: 'Many IP-based systems support mobile answering, subject to the selected equipment and a suitable internet connection. We will explain whether calls, video, and remote unlocking are available on the recommended platform.' },
      { question: 'Can one outdoor panel serve several apartments?', answer: 'Yes. Multi-unit systems are designed with directories and call routing for individual apartments. The number of units, monitors, entrance points, and management functions determines the appropriate equipment.' },
    ],
  },
  'smart-door-locks': {
    key: 'smart-door-locks', theme: 'gold', eyebrow: 'Smart door locks',
    title: 'A smarter welcome.', accent: 'Without the key ring.',
    description: 'Fingerprint, card, PIN, and app-enabled door locks selected for your door, household or office users, and preferred way of granting access.',
    highlights: ['Fingerprint and PIN entry', 'Card and mobile options', 'User access you can manage'],
    overviewTitle: 'Convenient entry with the fundamentals properly considered.',
    overviewText: 'Door material, thickness, existing mortise, alignment, handle operation, weather exposure, and fallback access all matter before choosing a smart lock.',
    features: [
      { title: 'Flexible ways to unlock', text: 'Depending on the model, use fingerprint, PIN, card, mobile app, or mechanical key fallback to suit different users.' },
      { title: 'Access for family, staff, and guests', text: 'Manage individual credentials, temporary codes where supported, and additions or removals as people change.' },
      { title: 'A lock fitted to the actual door', text: 'Compatibility, alignment, mortise, handle action, battery access, and finish are checked before installation.' },
    ],
    steps: [
      { title: 'Check the door and users', text: 'We inspect construction and hardware, then discuss who needs access and how credentials should be managed.' },
      { title: 'Select the suitable model', text: 'Unlock methods, app features, finish, fallback, and installation requirements are compared clearly.' },
      { title: 'Fit and enrol', text: 'We install, test mechanical operation, enrol initial users, demonstrate battery care, and explain fallback access.' },
    ],
    detailText: 'Smart features are only useful when the underlying door closes and locks correctly. We address alignment and mechanical action first, then configure the digital access around your users.',
    checklist: ['Door compatibility checked before purchase', 'Mechanical and electronic operation tested', 'User enrolment and battery guidance included'],
    related: [
      { href: '/solutions/smart-home-automation', label: 'Smart home automation', text: 'Connect entry with the wider home.' },
      { href: '/solutions/intercom-systems', label: 'Intercom systems', text: 'See and speak with visitors at the door.' },
    ],
    faqs: [
      { question: 'What happens when the batteries run low?', answer: 'Smart locks normally provide low-battery warnings, with emergency power or mechanical key options varying by model. We demonstrate the exact fallback procedure and recommend replacing batteries before they are exhausted.' },
      { question: 'Can a smart lock be fitted to any door?', answer: 'No single model fits every door. Material, thickness, existing lock case, frame clearance, alignment, and exposure all affect compatibility. A door inspection or clear photos and measurements help us recommend safely.' },
    ],
  },
  'telephone-systems': {
    key: 'telephone-systems', theme: 'blue', eyebrow: 'Telephone systems',
    title: 'Every conversation,', accent: 'clearly connected.',
    description: 'Business telephone and IP communication systems with extensions, call routing, handsets, and structured administration for offices and multi-user sites.',
    highlights: ['Office extensions and handsets', 'Call routing and administration', 'IP-based options'],
    overviewTitle: 'Communication organised around the way your team answers.',
    overviewText: 'Departments, opening hours, call volume, remote users, existing cabling, and internet connectivity shape a telephone system that works in daily practice.',
    features: [
      { title: 'Extensions and call handling', text: 'Connect users, departments, and answering points with direct extensions, transfers, and routing appropriate to your organisation.' },
      { title: 'IP telephony options', text: 'Supported IP handsets and platforms can use your data network to provide flexible business communication.' },
      { title: 'Manageable everyday administration', text: 'Names, extensions, user changes, routing, and handset operation are documented for the people managing the system.' },
    ],
    steps: [
      { title: 'Review users and call flow', text: 'We map departments, handsets, incoming calls, existing numbers, connectivity, and desired answering behavior.' },
      { title: 'Design the platform and routes', text: 'Equipment, extensions, network, handsets, and call handling are specified around current and expected users.' },
      { title: 'Install and test conversations', text: 'We configure, test internal and external paths, and guide users through transfers and routine administration.' },
    ],
    detailText: 'Telephone reliability depends on both the call platform and the network beneath it. We consider switching, structured cabling, power, internet performance, and handset placement as part of the same design.',
    checklist: ['Call flow documented before configuration', 'Network readiness included in the assessment', 'User and administrator guidance at handover'],
    related: [
      { href: '/solutions/internet-wifi', label: 'Internet & Wi-Fi', text: 'Strengthen the network behind business communication.' },
      { href: '/solutions/ceiling-sound-systems', label: 'Ceiling sound systems', text: 'Coordinate workplace audio and announcements.' },
    ],
    faqs: [
      { question: 'Can a new system use our existing telephone numbers?', answer: 'Number retention depends on the current provider, line type, contract, and chosen platform. We will review the existing service before recommending any migration or change of call routing.' },
      { question: 'Do IP phones need a separate network?', answer: 'Not always, but voice traffic, switching, power, and network quality need to be assessed. We will recommend an appropriate setup for your call volume and existing infrastructure.' },
    ],
  },
  'speed-gates-turnstiles': {
    key: 'speed-gates-turnstiles', theme: 'gold', eyebrow: 'Speed gates & turnstiles',
    title: 'Elegant entrances.', accent: 'Controlled by design.',
    description: 'Pedestrian speed gates, turnstiles, and lobby entrance lanes integrated with access control for offices, residential towers, and managed facilities.',
    highlights: ['Pedestrian flow management', 'Lobby and reception integration', 'Reader and access connectivity'],
    overviewTitle: 'Balance a welcoming entrance with meaningful access control.',
    overviewText: 'Lane width, pedestrian volume, accessibility, visitor handling, finishes, emergency operation, and reception workflows all belong in the entrance design.',
    features: [
      { title: 'Speed gates for modern lobbies', text: 'Slim pedestrian lanes with credential readers and opening behavior selected around throughput and the character of the space.' },
      { title: 'Turnstiles for controlled passage', text: 'Mechanical and motorised options can organise entry and exit where pedestrian permissions need to be enforced.' },
      { title: 'Integrated visitor and staff access', text: 'Cards, biometrics, QR or other supported credentials can be coordinated with reception and the access control platform.' },
    ],
    steps: [
      { title: 'Study the entrance journey', text: 'We review lobby geometry, pedestrian peaks, reception, accessibility, visitors, and emergency routes.' },
      { title: 'Design lanes and permissions', text: 'Cabinet positions, lane widths, readers, control logic, and finish are planned as one entrance composition.' },
      { title: 'Install and validate flow', text: 'We test credentials, passage, anti-tailgating features where present, accessibility, and release behavior.' },
    ],
    detailText: 'Pedestrian control must work for everyone using the building. Accessible passage, deliveries, visitors, emergency release, and peak-time queues are considered alongside security and appearance.',
    checklist: ['Lobby layout and accessible route assessed', 'Credentials matched to staff and visitor workflows', 'Normal and emergency operation tested'],
    related: [
      { href: '/services/access-control', label: 'Access control', text: 'Define the permissions behind every lane.' },
      { href: '/services/gate-barriers', label: 'Vehicle gate barriers', text: 'Coordinate vehicle entry with pedestrian access.' },
    ],
    faqs: [
      { question: 'Can speed gates match our lobby interior?', answer: 'Cabinet dimensions, lid and side finishes, indicator lighting, and reader integration vary by model. We consider available finishes alongside lane function so the equipment complements the space.' },
      { question: 'How do visitors pass through?', answer: 'Visitor workflows can involve reception-assisted access, temporary cards, QR credentials, or another supported method. We design this around your reception staffing and security policy rather than assuming one approach.' },
    ],
  },
  'metal-detectors': {
    key: 'metal-detectors', theme: 'red', eyebrow: 'Metal detectors',
    title: 'Screening with purpose.', accent: 'Flow without friction.',
    description: 'Walk-through and handheld metal detection solutions for controlled entrances, events, facilities, and security checkpoints.',
    highlights: ['Walk-through screening', 'Handheld inspection support', 'Checkpoint flow planning'],
    overviewTitle: 'A checkpoint is a process, not just a piece of equipment.',
    overviewText: 'Detection settings, traffic, staff procedures, bag handling, secondary checks, accessibility, and visitor communication all shape an effective screening point.',
    features: [
      { title: 'Walk-through detection', text: 'Archway detectors selected and positioned around the required screening sensitivity, throughput, and entrance environment.' },
      { title: 'Handheld secondary screening', text: 'Handheld detectors support targeted follow-up when a person or item needs additional inspection.' },
      { title: 'Practical checkpoint setup', text: 'Queuing, tables, staff positions, signage, and secondary-check workflows can be considered alongside the detector.' },
    ],
    steps: [
      { title: 'Define the screening objective', text: 'We discuss the venue, people flow, risk, staffing, and what the checkpoint needs to achieve.' },
      { title: 'Select and position equipment', text: 'Detector type, sensitivity, placement, power, and supporting checkpoint elements are planned together.' },
      { title: 'Commission and guide operators', text: 'Settings, alarms, throughput, and operator procedures are tested with attention to consistent screening.' },
    ],
    detailText: 'Nearby metal structures, electrical interference, floor conditions, and passing objects can influence screening. We assess the real position rather than treating an archway as a standalone plug-and-play purchase.',
    checklist: ['Entrance environment and throughput assessed', 'Equipment positioned for consistent operation', 'Operator workflow and secondary checks considered'],
    related: [
      { href: '/services/cctv-surveillance', label: 'CCTV surveillance', text: 'Add visual coverage to the checkpoint.' },
      { href: '/solutions/speed-gates-turnstiles', label: 'Speed gates & turnstiles', text: 'Coordinate screening with controlled passage.' },
    ],
    faqs: [
      { question: 'Will nearby metal doors or structures affect the detector?', answer: 'They can, depending on distance, material, movement, and the detector model. A site assessment helps identify a suitable position and any installation constraints before equipment is chosen.' },
      { question: 'Can sensitivity be adjusted for different events?', answer: 'Many professional detectors offer adjustable zones and sensitivity programs. The appropriate setting should balance the screening objective with throughput and be operated by trained staff.' },
    ],
  },
  'cctv-drawings': {
    key: 'cctv-drawings', theme: 'blue', eyebrow: 'CCTV drawings',
    title: 'Every camera decision,', accent: 'documented clearly.',
    description: 'Site-specific CCTV layouts, camera schedules, coverage intent, and recording storage calculations that connect design, installation, and approval.',
    highlights: ['Camera layout documentation', 'Equipment and camera schedules', 'Recording storage calculation'],
    overviewTitle: 'Give everyone the same plan to work from.',
    overviewText: 'A useful drawing translates the survey into positions and information that designers, installers, reviewers, and site teams can understand consistently.',
    features: [
      { title: 'Camera layout plans', text: 'Camera locations, references, and coverage intent are marked on the available site plan to guide installation and review.' },
      { title: 'Equipment and system details', text: 'Camera types, recorder arrangement, and related equipment information can be organised into a clear project reference.' },
      { title: 'Recording storage calculations', text: 'Camera count, recording settings, retention target, and estimated capacity are connected so storage is not left to assumption.' },
    ],
    steps: [
      { title: 'Collect plans and requirements', text: 'We review available drawings, the physical site, coverage expectations, recording needs, and approval scope.' },
      { title: 'Develop the design package', text: 'Camera positions, equipment details, and storage calculations are prepared and checked for consistency.' },
      { title: 'Review and use on site', text: 'The agreed documentation becomes a shared reference for installation, inspection, and handover.' },
    ],
    detailText: 'Documentation should reflect what can actually be installed. Ceiling heights, obstructions, cable routes, recorder location, network points, and access for maintenance all inform a buildable camera plan.',
    checklist: ['Drawings based on real site information', 'Camera references consistent across documents', 'Storage assumptions made visible'],
    related: [
      { href: '/services/moi-ssd-approval', label: 'MOI-SSD approval', text: 'Connect the drawing package to approval delivery.' },
      { href: '/services/cctv-surveillance', label: 'CCTV surveillance', text: 'Turn the plan into a complete installed system.' },
    ],
    faqs: [
      { question: 'Can you prepare a drawing from my existing floor plan?', answer: 'Yes, if the plan is readable and reflects the current site. PDF or CAD information is useful, but a site visit may still be needed to confirm ceilings, obstructions, mounting positions, and cable routes.' },
      { question: 'How accurate is a storage calculation?', answer: 'It is an engineering estimate based on camera count, codec, resolution, frame rate, scene activity, recording schedule, and retention target. We state the assumptions so the final recorder settings and usable drive capacity can be checked.' },
    ],
  },
  'ceiling-sound-systems': {
    key: 'ceiling-sound-systems', theme: 'gold', eyebrow: 'Ceiling sound systems',
    title: 'Sound that belongs', accent: 'to the space.',
    description: 'Ceiling speakers, amplifiers, zoning, and background audio for offices, retail, hospitality, mosques, and shared environments.',
    highlights: ['Discreet ceiling speakers', 'Background audio and announcements', 'Zones matched to the venue'],
    overviewTitle: 'Even, comfortable audio without visual clutter.',
    overviewText: 'Room dimensions, ceiling construction, audience areas, ambient noise, speech intelligibility, and source equipment guide speaker quantity and placement.',
    features: [
      { title: 'Background music systems', text: 'Create consistent, comfortable coverage across customer, work, and communal areas without obvious hotspots.' },
      { title: 'Announcements and zoning', text: 'Separate zones and announcement functions can be arranged for the way different areas are used and managed.' },
      { title: 'Discreet equipment integration', text: 'Ceiling speaker positions, amplifier location, controls, sources, and cable routes are considered with the interior.' },
    ],
    steps: [
      { title: 'Listen to the space', text: 'We assess dimensions, ceiling, ambient sound, audience areas, and the purpose of each zone.' },
      { title: 'Design coverage and control', text: 'Speaker layout, amplification, sources, zones, and volume controls are matched to the venue.' },
      { title: 'Install and tune', text: 'We test coverage and intelligibility, set sensible operating levels, and explain daily control.' },
    ],
    detailText: 'More volume is not a substitute for good coverage. Speaker distribution, height, furnishings, and room acoustics influence clarity, so the design aims for balanced listening rather than simply powerful amplification.',
    checklist: ['Speaker positions coordinated with the ceiling', 'Zones and sources matched to actual use', 'Levels and announcements tested on site'],
    related: [
      { href: '/solutions/telephone-systems', label: 'Telephone systems', text: 'Coordinate broader workplace communication.' },
      { href: '/solutions/central-satellite', label: 'Central satellite', text: 'Plan additional building media distribution.' },
    ],
    faqs: [
      { question: 'Can the system play different audio in different areas?', answer: 'Yes, with a suitable multi-zone platform and source arrangement. We will clarify whether you need independent sources, independent volume only, or paging that can override selected zones.' },
      { question: 'Can speakers be installed in an existing ceiling?', answer: 'Usually, subject to ceiling construction, access above the ceiling, cable routes, fire requirements, and coordination with lights, air conditioning, and other services. A physical inspection confirms the practical approach.' },
    ],
  },
  'internet-wifi': {
    key: 'internet-wifi', theme: 'blue', eyebrow: 'Internet & Wi-Fi',
    title: 'A stronger foundation', accent: 'for everything connected.',
    description: 'Structured cabling, switching, Wi-Fi coverage, and network equipment for security systems, homes, offices, and commercial environments.',
    highlights: ['Structured network cabling', 'Reliable Wi-Fi coverage', 'Switching and connected systems'],
    overviewTitle: 'Connectivity planned around people, devices, and the building.',
    overviewText: 'Walls, floors, access point positions, device density, internet service, switching, and cabling all affect the experience more than a router specification alone.',
    features: [
      { title: 'Structured cabling', text: 'Organised data outlets, cable routes, patching, switching, and labelling create a maintainable foundation for devices and future expansion.' },
      { title: 'Wi-Fi coverage and capacity', text: 'Access point positions and quantities are planned around coverage, construction, user density, and connected equipment.' },
      { title: 'Security-system networking', text: 'Cameras, recorders, intercoms, access controllers, and remote access are considered alongside everyday business and home traffic.' },
    ],
    steps: [
      { title: 'Assess coverage and infrastructure', text: 'We review the internet service, existing cabling, building materials, device locations, and problem areas.' },
      { title: 'Design the network layout', text: 'Cabling, rack or cabinet positions, switching, access points, power, and expansion are documented.' },
      { title: 'Install and measure performance', text: 'We terminate, label, configure, and test connectivity and coverage in the places users actually need it.' },
    ],
    detailText: 'A premium network is organised and understandable. Clear cabinet layout, labelled outlets, documented equipment, sensible Wi-Fi naming, and considered access credentials make it easier to own and support.',
    checklist: ['Coverage planned for real rooms and usage', 'Cabling and equipment labelled for maintenance', 'Connected security devices included in the design'],
    related: [
      { href: '/services/cctv-surveillance', label: 'CCTV surveillance', text: 'Build reliable camera and remote-viewing connectivity.' },
      { href: '/solutions/telephone-systems', label: 'Telephone systems', text: 'Support clear business communication.' },
    ],
    faqs: [
      { question: 'Why is Wi-Fi weak in some rooms?', answer: 'Construction, distance, interference, access point placement, device capability, and network load can all contribute. We assess the environment before recommending relocation, additional access points, or wired connections.' },
      { question: 'Can you keep my existing internet provider and router?', answer: 'Often, yes. We can assess the existing service and equipment, then design the internal network around what is worth retaining while identifying any limitations affecting coverage or connected systems.' },
    ],
  },
  'central-satellite': {
    key: 'central-satellite', theme: 'gold', eyebrow: 'Central satellite',
    title: 'One distribution system.', accent: 'Every screen connected.',
    description: 'Central satellite and television signal distribution for villas, residential buildings, offices, hospitality, and shared properties.',
    highlights: ['Central signal distribution', 'Multi-room connectivity', 'Building-wide planning'],
    overviewTitle: 'Consistent television distribution without duplicated equipment everywhere.',
    overviewText: 'Dish position, signal source, distribution equipment, cable routes, outlets, and the number of viewing points all need to work as one system.',
    features: [
      { title: 'Centralised signal planning', text: 'Source equipment and distribution architecture are arranged around the property and the channels or services required.' },
      { title: 'Multiple viewing points', text: 'Rooms and common areas can be connected through planned outlets and distribution rather than improvised individual runs.' },
      { title: 'Organised building infrastructure', text: 'Cable routing, splitters, amplifiers where needed, outlets, and equipment locations are designed for signal quality and maintenance.' },
    ],
    steps: [
      { title: 'Survey signal and property', text: 'We review the desired service, dish or source position, building layout, outlets, and existing cabling.' },
      { title: 'Design the distribution', text: 'Equipment, signal levels, cable paths, viewing points, and future expansion are planned together.' },
      { title: 'Install and test every outlet', text: 'We configure the source, check reception and distribution, and verify viewing at connected points.' },
    ],
    detailText: 'Signal quality can be affected long before it reaches the television. Dish alignment, connectors, cable condition, splitting losses, amplification, and outlet termination are all part of a reliable installation.',
    checklist: ['Source and dish position assessed', 'Distribution designed for the required outlets', 'Reception checked at connected viewing points'],
    related: [
      { href: '/solutions/internet-wifi', label: 'Internet & Wi-Fi', text: 'Coordinate the building’s connected infrastructure.' },
      { href: '/solutions/ceiling-sound-systems', label: 'Ceiling sound systems', text: 'Complete the property’s audio-visual environment.' },
    ],
    faqs: [
      { question: 'Can existing satellite cabling be reused?', answer: 'Possibly. We need to inspect cable type, condition, routes, connectors, splitters, and signal levels. Suitable infrastructure can be retained where it supports the required distribution reliably.' },
      { question: 'Can each room watch independently?', answer: 'That depends on the source service, receivers, and distribution architecture. We will clarify the channels and independent viewing expected before recommending equipment.' },
    ],
  },
  'security-accessories': {
    key: 'security-accessories', theme: 'gold', eyebrow: 'Security accessories',
    title: 'The small components.', accent: 'That complete the system.',
    description: 'Recording drives, power supplies, mounts, cabling, connectors, switches, enclosures, and supporting accessories chosen for compatibility and dependable operation.',
    highlights: ['Compatible system components', 'Recording and power accessories', 'Mounts, cabling, and enclosures'],
    overviewTitle: 'Reliability depends on more than the headline device.',
    overviewText: 'The right accessory must match the equipment, environment, electrical demand, recording workload, and physical installation—not simply fit the shopping list.',
    features: [
      { title: 'Recording and storage accessories', text: 'Surveillance-rated drives and related components selected around recorder compatibility, camera workload, and retention needs.' },
      { title: 'Power and network support', text: 'Power supplies, switching, connectors, and related equipment considered for device requirements and operating conditions.' },
      { title: 'Installation and protection', text: 'Mounts, brackets, junction boxes, enclosures, cabling, and finishing components support a neat and serviceable installation.' },
    ],
    steps: [
      { title: 'Identify the actual requirement', text: 'We check device models, quantities, environment, current symptoms, and the purpose of the accessory.' },
      { title: 'Confirm compatibility', text: 'Electrical, physical, network, and recording requirements are compared before recommending a component.' },
      { title: 'Supply or install correctly', text: 'Where installation is included, connections, mounting, configuration, and operation are checked before completion.' },
    ],
    detailText: 'A lower-priced unsuitable power supply, drive, connector, or mount can become the most expensive part of a system through downtime and repeat visits. Compatibility and duty matter.',
    checklist: ['Model and compatibility checked', 'Operating environment and duty considered', 'Installation accessories matched to the finish required'],
    related: [
      { href: '/cameras', label: 'Camera catalogue', text: 'Browse currently available camera equipment.' },
      { href: '/services/installation-maintenance', label: 'Installation & maintenance', text: 'Have components fitted and checked professionally.' },
    ],
    faqs: [
      { question: 'Can I use a normal desktop hard drive for CCTV?', answer: 'Surveillance recording has a different continuous workload from ordinary desktop use. We generally recommend drives intended for surveillance and compatible with the recorder and required camera workload.' },
      { question: 'Can you supply an accessory without installation?', answer: 'Contact us with the device model and required part. We will confirm availability and compatibility; for power, storage, and safety-related components, professional assessment or installation may be advisable.' },
    ],
  },
  'moi-projects': {
    key: 'moi-projects', theme: 'red', eyebrow: 'MOI projects',
    title: 'Regulated delivery.', accent: 'Without disconnected steps.',
    description: 'A complete project service for sites requiring Ministry of Interior approval, connecting survey, design, storage, installation, inspection, and handover.',
    highlights: ['One connected project team', 'Design-to-installation consistency', 'Inspection and handover support'],
    overviewTitle: 'MOI delivery is a chain of decisions—not a single submission.',
    overviewText: 'We manage the relationships between the site, camera plan, recording storage, approved design, installed equipment, and final inspection so changes remain visible and coordinated.',
    features: [
      { title: 'A defined approval pathway', text: 'The project begins by clarifying site scope, coverage, recording requirements, responsibilities, and the documents needed.' },
      { title: 'Coordinated technical delivery', text: 'Drawings, storage calculations, equipment selection, cabling, recording, and installation are developed around the same plan.' },
      { title: 'Inspection-ready closeout', text: 'Testing, documentation, and handover focus on keeping the finished system consistent with what was designed and approved.' },
    ],
    steps: [
      { title: 'Survey and document', text: 'We assess the property and build the camera plan, equipment schedule, and recording storage basis.' },
      { title: 'Approve and install', text: 'The agreed documentation guides procurement and installation, with any necessary changes reviewed in context.' },
      { title: 'Test and complete', text: 'Recording, playback, coverage, and documentation are checked before inspection support and project handover.' },
    ],
    detailText: 'The real risk in an MOI project is fragmentation: one party draws, another supplies, another installs, and nobody owns the differences. Our process keeps those choices connected.',
    checklist: ['Approval scope established before procurement', 'Changes assessed against the complete design', 'Documentation carried through to closeout'],
    related: [
      { href: '/services/moi-ssd-approval', label: 'MOI-SSD approval service', text: 'Explore the technical approval requirements.' },
      { href: '/solutions/cctv-drawings', label: 'CCTV drawings', text: 'See what the design package contains.' },
    ],
    faqs: [
      { question: 'Can you take over an MOI project already in progress?', answer: 'Yes, subject to a technical and documentation review. We first establish what has been approved, purchased, installed, or changed, then identify the remaining work and any inconsistencies that need resolution.' },
      { question: 'Does approval cover future system changes?', answer: 'Not automatically. Camera moves, model substitutions, recording changes, and expansion can affect the approved design or storage basis. Contact us before modifying an approval-regulated system so the impact can be assessed.' },
    ],
  },
  'non-moi-projects': {
    key: 'non-moi-projects', theme: 'blue', eyebrow: 'Non-MOI projects',
    title: 'Homes and businesses.', accent: 'Secured around real life.',
    description: 'Security and low-current projects for villas, offices, shops, residential compounds, and other sites that do not require the MOI-SSD approval workflow.',
    highlights: ['Villas and residential compounds', 'Offices, shops, and businesses', 'Design, installation, and aftercare'],
    overviewTitle: 'The same care, shaped around a simpler delivery path.',
    overviewText: 'Without an approval workflow, we can focus directly on your priorities, site conditions, equipment preferences, budget, installation timing, and the support you want afterwards.',
    features: [
      { title: 'Residential security', text: 'CCTV, intercoms, alarms, smart locks, Wi-Fi, and home automation planned around family routines and the character of the property.' },
      { title: 'Business and retail systems', text: 'Surveillance, access control, attendance, networks, sound, and entrance systems coordinated with staff and customer movement.' },
      { title: 'Flexible aftercare', text: 'Remote assistance, repairs, and optional annual maintenance help the installation continue to serve changing needs.' },
    ],
    steps: [
      { title: 'Free site survey', text: 'We listen, walk the property, identify priorities, and discuss practical options and constraints.' },
      { title: 'Clear design and quotation', text: 'You receive a recommendation with equipment, model details, scope, and pricing visible before work begins.' },
      { title: 'Installation and support', text: 'We complete, test, and explain the system, then remain available for technical help and maintenance.' },
    ],
    detailText: 'A simpler approval path does not mean a lower standard. We still plan coverage, storage, connectivity, power, access, finishes, and future serviceability with the same attention to detail.',
    checklist: ['Scope tailored to your property and budget', 'Itemised quotation before installation', 'Aftercare available when your needs change'],
    related: [
      { href: '/services/cctv-surveillance', label: 'CCTV surveillance', text: 'Explore camera planning for your property.' },
      { href: '/solutions/smart-home-automation', label: 'Smart home automation', text: 'Connect security with everyday living.' },
    ],
    faqs: [
      { question: 'Can the project be completed in phases?', answer: 'Yes, where the design allows it. We can agree a sensible first phase while considering power, cabling, recorder capacity, network, and expansion so later additions do not require unnecessary rework.' },
      { question: 'Can you work around our business hours or family routine?', answer: 'We discuss access and timing during the survey. Installation can be planned around occupied areas, customer hours, and any downtime constraints, with the sequence agreed before work starts.' },
    ],
  },
  support: {
    key: 'support', theme: 'teal', eyebrow: 'Support',
    title: 'Real help.', accent: 'Day or night.',
    description: 'A direct route to Jama Go for urgent site issues, remote viewing, settings, user changes, maintenance, and technical questions about your security system.',
    highlights: ['24/7 urgent support line', 'Phone, WhatsApp, and email', 'Planned maintenance available'],
    overviewTitle: 'Start with the right support route.',
    overviewText: 'The fastest way to resolve an issue is to share what happened, which system is affected, when it started, and any error or indicator you can see.',
    features: [
      { title: 'Urgent technical assistance', text: 'Call the 24/7 support line when recording, access, alarms, or another essential site function needs immediate attention.' },
      { title: 'Routine configuration help', text: 'Get assistance with apps, remote viewing, users, passwords, settings, and understanding how your system is meant to operate.' },
      { title: 'Planned system care', text: 'Annual maintenance adds scheduled checks for recording, storage, power, connectivity, devices, and overall system condition.' },
    ],
    steps: [
      { title: 'Tell us what is happening', text: 'Call or message with your site, system, symptoms, and any recent changes or error messages.' },
      { title: 'We assess the full chain', text: 'We check the relevant device, power, network, configuration, recording, and user workflow as appropriate.' },
      { title: 'Resolve or plan the next action', text: 'Where remote help is not enough, we explain the visit, repair, replacement, or maintenance step required.' },
    ],
    detailText: 'Before calling, avoid repeated password changes or factory resets unless our team asks you to perform them. A photo of the error, device label, recorder status, or indicator can make diagnosis much clearer.',
    checklist: ['Site name and callback number ready', 'Device model or equipment photo if available', 'A short description of when the issue began'],
    related: [
      { href: '/services/amc-maintenance', label: 'AMC services', text: 'Move from reactive fixes to planned care.' },
      { href: '/contact', label: 'Contact Jama Go', text: 'Find every phone, WhatsApp, email, and showroom option.' },
    ],
    faqs: [
      { question: 'Is the 24/7 line for every enquiry?', answer: 'The line is available for urgent site issues at any hour. Routine quotations, showroom questions, and non-urgent administration are best handled during office hours so the right specialist can respond fully.' },
      { question: 'What should I avoid doing before support arrives?', answer: 'Avoid factory resets, unplanned rewiring, or deleting recordings and configurations. If it is safe, note the symptoms and any indicators, then contact us before making changes that could remove useful diagnostic information.' },
    ],
  },
  journal: {
    key: 'journal', theme: 'gold', eyebrow: 'The Jama Go Journal',
    title: 'Clarity before', accent: 'you commit.',
    description: 'Practical guidance from the way we survey, design, document, install, and care for security systems across Qatar.',
    highlights: ['Plain-language security guidance', 'Design and approval insights', 'Maintenance advice that matters'],
    overviewTitle: 'Understand the decisions behind a dependable system.',
    overviewText: 'Our guides are written to help property owners, managers, and project teams ask better questions and recognise what a complete proposal should contain.',
    features: [
      { title: 'What should a useful site survey cover?', text: 'Why entrances, movement, lighting, blind spots, recording, and user needs matter more than starting with a camera count.', href: '/journal/site-survey' },
      { title: 'Why plan MOI approval before buying equipment?', text: 'See how coverage, storage, documentation, and approved design choices affect one another throughout the project.', href: '/journal/moi-planning' },
      { title: 'What does an AMC actually protect?', text: 'Look beyond the contract name to the recording, power, connectivity, settings, and people that maintenance supports.', href: '/journal/amc-value' },
    ],
    steps: [
      { title: 'Start with your project', text: 'Choose the guide closest to your current question: planning, approval, or long-term care.' },
      { title: 'Use it in the conversation', text: 'Bring the checklist or questions to your survey and compare them with the recommendation you receive.' },
      { title: 'Turn insight into a clear plan', text: 'Book a free site visit when you are ready to apply the guidance to your own property.' },
    ],
    detailText: 'The Journal is intentionally practical. It does not replace a site-specific design, but it gives you a stronger framework for evaluating equipment, scope, storage, documentation, and aftercare.',
    checklist: ['Written around real delivery decisions', 'No generic product rankings or invented figures', 'Direct link from every guide to a relevant service'],
    related: [
      { href: '/journal/site-survey', label: 'Start with the survey guide', text: 'Learn what a complete assessment should include.' },
      { href: '/contact', label: 'Ask a project question', text: 'Discuss your own site with our team.' },
    ],
    faqs: [
      { question: 'Are these guides specific to Qatar?', answer: 'The general engineering principles are widely useful, while approval and service guidance is written for Jama Go’s work in Qatar. Your exact requirements still depend on the property and project scope.' },
      { question: 'Will you add more topics?', answer: 'The Journal can grow with the questions customers ask most often. If there is a subject you would like explained, send it through the Contact page and our team can consider it for a future guide.' },
    ],
  },
  'journal-site-survey': {
    key: 'journal-site-survey', theme: 'blue', eyebrow: 'Journal · CCTV planning',
    title: 'What should a useful', accent: 'site survey cover?',
    description: 'A good camera plan starts with how your site works—not with a number of cameras. Here is what a productive survey should uncover before equipment is quoted.',
    highlights: ['Movement before camera count', 'Lighting and blind spots', 'Recording and user needs'],
    overviewTitle: 'The survey is where unnecessary equipment—and missed details—become visible.',
    overviewText: 'A walk-through connects your concerns to actual viewing angles, distances, infrastructure, and user behavior. It turns a vague request into a design brief.',
    features: [
      { title: 'Entrances, movement, and purpose', text: 'We identify where people and vehicles arrive, how they move, and whether each view needs overview, recognition, or closer detail.' },
      { title: 'Light, obstruction, and mounting', text: 'Day and night lighting, backlighting, ceilings, walls, landscaping, signs, and other obstructions affect the useful camera position.' },
      { title: 'Recording, network, and viewers', text: 'Retention, playback, internet, cabling, recorder location, remote access, and user permissions are discussed as part of the same system.' },
    ],
    steps: [
      { title: 'Walk the site with us', text: 'Show us the areas that concern you and explain what happened—or what you want to prevent or review.' },
      { title: 'Ask how each view will be used', text: 'A camera is only useful if its position, lens, light, and resolution support the intended image.' },
      { title: 'Expect a complete recommendation', text: 'The proposal should connect cameras, recorder, storage, network, installation, configuration, and aftercare.' },
    ],
    detailText: 'Before accepting a quotation, ask whether you can see the logic behind every camera position and every major line item. A clear survey makes that logic much easier to explain.',
    checklist: ['The reason for each camera position is clear', 'Recording and playback needs are discussed', 'Installation and network constraints are identified'],
    related: [
      { href: '/services/cctv-surveillance', label: 'CCTV surveillance', text: 'See how we turn the survey into a complete system.' },
      { href: '/journal/moi-planning', label: 'Next: approval planning', text: 'Understand why equipment should follow the design.' },
    ],
    faqs: [
      { question: 'Can you quote from photos alone?', answer: 'Photos and plans can help with an initial conversation, but they may not reveal viewing angles, lighting changes, cable routes, recorder position, or network conditions. A physical survey gives the recommendation a more dependable basis.' },
      { question: 'What should I prepare for the visit?', answer: 'Point out your concerns, any previous incidents, areas you want to view remotely, expected recording days, and any preferred equipment or budget constraints. Existing plans and system details are also useful.' },
    ],
  },
  'journal-moi-planning': {
    key: 'journal-moi-planning', theme: 'red', eyebrow: 'Journal · MOI-SSD',
    title: 'Why plan approval', accent: 'before buying equipment?',
    description: 'Storage, coverage, and documentation need to work together from day one. Early equipment purchases can create avoidable changes when they precede the approved design.',
    highlights: ['Approved design before procurement', 'Coverage and storage connected', 'Changes assessed in context'],
    overviewTitle: 'The drawing is not just paperwork—it is an equipment decision.',
    overviewText: 'Camera quantity, type, position, recording settings, retention, recorder, and drive capacity all influence one another. Approval planning keeps those relationships visible.',
    features: [
      { title: 'Coverage drives the camera schedule', text: 'The required views and approval expectations inform camera positions and models, rather than available stock determining the design.' },
      { title: 'Retention drives storage', text: 'Recording days, camera count, codec, resolution, frame rate, and activity assumptions influence the recorder and drive capacity.' },
      { title: 'The approved plan guides installation', text: 'Installers need a consistent reference so the finished system matches the documented positions and technical intent.' },
    ],
    steps: [
      { title: 'Establish the approval scope', text: 'Confirm the site requirements before treating any camera list or recorder specification as final.' },
      { title: 'Coordinate the design package', text: 'Review the drawing, camera schedule, recording parameters, and storage calculation together.' },
      { title: 'Control later substitutions', text: 'Assess changes to model, position, count, or recording settings for their effect on the whole project.' },
    ],
    detailText: 'Buying first can seem faster, but substitutions, additional storage, relocation, or redesign can cost more time later. A coordinated package gives procurement and installation a stable reference.',
    checklist: ['Camera layout reviewed before equipment order', 'Storage assumptions documented', 'Installation follows the agreed design'],
    related: [
      { href: '/services/moi-ssd-approval', label: 'MOI-SSD approval', text: 'Explore our complete approval service.' },
      { href: '/solutions/cctv-drawings', label: 'CCTV drawings', text: 'See the documentation behind the plan.' },
    ],
    faqs: [
      { question: 'Can an equivalent camera model be substituted?', answer: 'It depends on the approval and technical requirements. Resolution is only one specification; lens, form factor, low-light performance, codec, coverage, and compatibility may all matter. Review substitutions before ordering or installing.' },
      { question: 'Why does recording time affect the drawing package?', answer: 'Retention determines how much video must be stored. Combined with camera quantity and recording settings, it influences drives and recorder selection, which are central parts of the complete system design.' },
    ],
  },
  'journal-amc-value': {
    key: 'journal-amc-value', theme: 'teal', eyebrow: 'Journal · Long-term care',
    title: 'What does an AMC', accent: 'actually protect?',
    description: 'The value of a security system depends on it working when you need it. Maintenance protects that readiness—not just the physical equipment.',
    highlights: ['Recording and playback checks', 'Power and connectivity health', 'Settings and user support'],
    overviewTitle: 'A system can appear normal while its usefulness is quietly reduced.',
    overviewText: 'A failed drive, disconnected camera, full recorder, weak battery, changed password, or network issue may remain unnoticed until footage or access is urgently needed.',
    features: [
      { title: 'Confidence in recording', text: 'Checks should look beyond live images to playback, storage condition, recording continuity, time settings, and available capacity.' },
      { title: 'Confidence in the supporting chain', text: 'Power supplies, batteries, network connections, switches, cabling, and environmental condition affect the devices they support.' },
      { title: 'Confidence for the people using it', text: 'User changes, remote viewing, passwords, settings, and guidance keep the system understandable as staff and needs change.' },
    ],
    steps: [
      { title: 'Create a baseline', text: 'Record what is installed, how it is configured, its current condition, and any known issues.' },
      { title: 'Check complete workflows', text: 'Test real tasks such as playback, remote access, door release, alarm notification, and user administration.' },
      { title: 'Act before issues become urgent', text: 'Use findings to plan adjustments, cleaning, replacements, repairs, training, or documentation updates.' },
    ],
    detailText: 'An AMC should have a visible scope and useful outcomes. Ask which systems are covered, what planned visits include, how support is requested, and how parts or corrective work are handled.',
    checklist: ['Live view and playback are both checked', 'Power and network dependencies are included', 'Contract scope and exclusions are clear'],
    related: [
      { href: '/services/amc-maintenance', label: 'AMC services', text: 'Explore planned care with Jama Go.' },
      { href: '/support', label: 'Technical support', text: 'Get help with a current system issue.' },
    ],
    faqs: [
      { question: 'How often should maintenance visits happen?', answer: 'The right frequency depends on the site, equipment, environment, usage, and risk. Dust, heat, continuous recording, user turnover, and previous faults may justify a different schedule from a small lightly used system.' },
      { question: 'Does an AMC guarantee that nothing will fail?', answer: 'No maintenance plan can promise zero failures. Its purpose is to identify deterioration earlier, preserve correct configuration, provide a clear support route, and reduce avoidable downtime.' },
    ],
  },
};

export const PAGE_ART_DIRECTION: Record<string, { theme: MarketingTheme; layout: MarketingLayout }> = {
  'why-us': { theme: 'gold', layout: 'editorial' },
  company: { theme: 'blue', layout: 'reverse' },
  results: { theme: 'teal', layout: 'centered' },
  'cctv-surveillance': { theme: 'blue', layout: 'editorial' },
  'access-control': { theme: 'gold', layout: 'reverse' },
  'intruder-alarms': { theme: 'red', layout: 'compact' },
  'gate-barriers': { theme: 'copper', layout: 'editorial' },
  'moi-ssd-approval': { theme: 'red', layout: 'reverse' },
  'installation-maintenance': { theme: 'cyan', layout: 'centered' },
  'amc-maintenance': { theme: 'teal', layout: 'editorial' },
  'smart-home-automation': { theme: 'violet', layout: 'centered' },
  'intercom-systems': { theme: 'cyan', layout: 'reverse' },
  'smart-door-locks': { theme: 'copper', layout: 'editorial' },
  'telephone-systems': { theme: 'blue', layout: 'compact' },
  'speed-gates-turnstiles': { theme: 'violet', layout: 'reverse' },
  'metal-detectors': { theme: 'red', layout: 'compact' },
  'cctv-drawings': { theme: 'cyan', layout: 'editorial' },
  'ceiling-sound-systems': { theme: 'gold', layout: 'centered' },
  'internet-wifi': { theme: 'blue', layout: 'reverse' },
  'central-satellite': { theme: 'copper', layout: 'editorial' },
  'security-accessories': { theme: 'olive', layout: 'compact' },
  'moi-projects': { theme: 'red', layout: 'reverse' },
  'non-moi-projects': { theme: 'blue', layout: 'editorial' },
  support: { theme: 'teal', layout: 'centered' },
  journal: { theme: 'gold', layout: 'editorial' },
  'journal-site-survey': { theme: 'blue', layout: 'reverse' },
  'journal-moi-planning': { theme: 'red', layout: 'compact' },
  'journal-amc-value': { theme: 'teal', layout: 'editorial' },
};
