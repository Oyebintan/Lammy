import type { CaseStudy, Evidence } from '@/lib/types';

const OWNER = 'Oyebintan';

const commit = (repo: string, sha: string, message: string, date: string): Evidence => ({
  type: 'commit',
  repo,
  sha,
  message,
  date,
  url: `https://github.com/${OWNER}/${repo}/commit/${sha}`,
});

const file = (repo: string, path: string, branch = 'main', excerpt?: string): Evidence => ({
  type: 'file',
  repo,
  path,
  url: `https://github.com/${OWNER}/${repo}/blob/${branch}/${path}`,
  excerpt,
});

const readme = (repo: string, heading?: string, branch = 'main'): Evidence => ({
  type: 'readme',
  repo,
  url: `https://github.com/${OWNER}/${repo}/blob/${branch}/README.md`,
  heading,
});

const release = (repo: string, tag: string, date: string): Evidence => ({
  type: 'release',
  repo,
  tag,
  date,
  url: `https://github.com/${OWNER}/${repo}/releases/tag/${tag}`,
});

/**
 * Hand-authored case studies, written from evidence that exists in the repos.
 *
 * `outcome` is deliberately null for every project without committed results.
 * Only the spam classifier has a metrics artifact in version control, so only
 * the spam classifier reports numbers.
 */
export const caseStudies: Record<string, CaseStudy> = {
  'siwes-finder': {
    problem: {
      value:
        'SIWES places every Nigerian undergraduate into a mandatory industrial attachment, but the process runs on paper and WhatsApp. Students cold-call companies with no visibility into who is actually hiring, employers have no channel to advertise placements, and school coordinators verify handwritten logbooks one student at a time. Three groups need the same information and none of them share a system.',
      via: { kind: 'authored' },
    },
    solution: {
      value:
        'One platform with three role-specific surfaces on shared data. Students search placements, track applications and keep a digital logbook. Employers post roles and review applicants from a hiring dashboard. Schools monitor placement rates and approve logbook entries in bulk. The web app covers coordinators and employers on desktop; a companion Android app covers students, who are overwhelmingly mobile-first.',
      via: { kind: 'authored' },
    },
    technologies: {
      value: ['TypeScript', 'Next.js', 'React', 'Expo', 'React Native', 'NextAuth', 'Google OAuth', 'Tailwind CSS'],
      via: {
        kind: 'derived',
        from: [
          { type: 'language', repo: 'Siwes-Finder', name: 'TypeScript', bytes: 1148388 },
          commit('Siwes-Finder', '58d2cf6065', 'feat(mobile): Google sign-in (v1.4.0)', '2026-07-18'),
        ],
      },
    },
    keyFeatures: {
      value: [
        'Role-aware routing — students, employers and school coordinators each land in a different application',
        'Digital logbook with offline queueing and client-side PDF export',
        'Employer hiring dashboard with job posting and applicant review',
        'School placement analytics with per-department breakdown',
        'Biometric and PIN quick-unlock on mobile',
        'Google sign-in shared between the web and Android clients',
      ],
      via: {
        kind: 'derived',
        from: [
          commit('Siwes-Finder', 'd1319ac74c', 'feat(mobile): logbook PDF export + streak nudge banner, v1.5.0', '2026-07-18'),
          commit('Siwes-Finder', 'aaf66141a7', 'feat: employer Home dashboard + mobile job posting', '2026-07-18'),
          commit('Siwes-Finder', '2a6283ba18', 'feat(mobile): PIN-keypad unlock alongside biometric', '2026-07-18'),
        ],
      },
    },
    challenges: {
      value: [
        {
          title: 'Two clients, one account',
          detail:
            'Google sign-in shipped on mobile against a new API route while the web already authenticated through NextAuth. Two independent lookups meant one person could end up with two accounts. A later audit found the mobile path using a case-sensitive query where the web path used a shared normalising helper — a legacy mixed-case email address would silently fork into a duplicate account. Both clients now resolve identity through the same helper.',
          evidence: [
            commit('Siwes-Finder', '58d2cf6065', 'feat(mobile): Google sign-in (v1.4.0)', '2026-07-18'),
            commit('Siwes-Finder', '99098939a5', 'chore: audit and clean up dead code, fix Google sign-in case bug', '2026-07-26'),
          ],
        },
        {
          title: 'Locking a session without logging it out',
          detail:
            'Adding idle auto-lock created a trap: a user with a PIN but no biometrics would be logged out on timeout instead of locked, because the restore path only recognised biometric enrolment. Quick-unlock capability became a single shared gate used by both cold-boot restore and the idle timer, so either factor keeps the session alive.',
          evidence: [
            commit('Siwes-Finder', 'c4b84472e8', 'feat(mobile): biometric/PIN unlock, v1.3.0', '2026-07-17'),
            commit('Siwes-Finder', '2a6283ba18', 'feat(mobile): PIN-keypad unlock alongside biometric', '2026-07-18'),
          ],
        },
        {
          title: 'Security review before launch, not after',
          detail:
            'A dedicated audit pass closed stored HTML injection and CSV formula injection in exported data, then a second pass hardened role escalation, rate limits, security headers and email normalisation. Both landed before the platform was opened to real users.',
          evidence: [
            commit('Siwes-Finder', '20108023d3', 'Security audit: fix stored HTML injection and CSV formula injection', '2026-07-12'),
            commit('Siwes-Finder', 'b9b65796eb', 'fix(security): audit hardening — role escalation, rate limits, headers, email normalization', '2026-07-14'),
          ],
        },
      ],
      via: { kind: 'authored' },
    },
    architecture: {
      value:
        'A Next.js App Router application serves the web clients and owns the API surface. The Expo/React Native app consumes the same routes, so business rules live in one place and the mobile client stays a presentation layer. Android builds ship through EAS with versioned release tags; the logbook PDF is generated on-device rather than server-side, which keeps export working without a round trip.',
      via: {
        kind: 'derived',
        from: [
          release('Siwes-Finder', 'v1.5.0-android-ci9', '2026-07-18'),
          commit('Siwes-Finder', 'd1319ac74c', 'feat(mobile): logbook PDF export + streak nudge banner, v1.5.0', '2026-07-18'),
        ],
      },
    },
    outcome: null,
  },

  brandforge: {
    problem: {
      value:
        'A founder naming a company needs the same deliverables an agency produces — positioning, tone of voice, palette, type, launch messaging — and none of the budget or the six-week timeline. The alternative is a logo generator, which produces a mark with no strategy behind it.',
      via: { kind: 'authored' },
    },
    solution: {
      value:
        'A five-question brief that expands into a full brand kit: strategy, voice, visual identity, marketing angles and a growth score, all exportable as a PDF. The whole product runs without an account — guest mode persists to local storage and falls back to a deterministic template engine when no AI key is configured, so the app is never a dead end for someone who just wants to try it.',
      via: { kind: 'authored' },
    },
    technologies: {
      value: ['TypeScript', 'Next.js 16', 'React 19', 'Tailwind CSS v4', 'Radix UI', 'Supabase', 'Anthropic API', 'jsPDF', 'Framer Motion'],
      via: {
        kind: 'derived',
        from: [
          file('BrandForge', 'package.json', 'claude/brandforge-ai-saas-jb4t71'),
          { type: 'language', repo: 'BrandForge', name: 'TypeScript', bytes: 185491 },
        ],
      },
    },
    keyFeatures: {
      value: [
        'Five-question brief that expands into a complete brand kit',
        'Strategy, tone of voice, visual identity, marketing angles and growth score',
        'PDF and deck export generated client-side',
        'Guest mode — full product with no account, persisted locally',
        'Graceful degradation to a template engine when no AI key is present',
        'Saved and favourited brands in a dashboard',
      ],
      via: { kind: 'derived', from: [readme('BrandForge', undefined, 'claude/brandforge-ai-saas-jb4t71')] },
    },
    challenges: {
      value: [
        {
          title: 'A product that still works with nothing configured',
          detail:
            'An AI SaaS usually breaks into a setup screen without credentials. BrandForge treats the AI provider as one implementation behind an interface, with a deterministic template engine as the other. With no environment variables at all the app still generates a complete kit and stores it locally — the difference is output quality, not availability.',
          evidence: [file('BrandForge', 'src/lib/ai', 'claude/brandforge-ai-saas-jb4t71')],
        },
        {
          title: 'Building on a framework version with moved conventions',
          detail:
            'The app targets Next.js 16, where request-time APIs are async-only and the middleware convention was renamed to proxy. Session refresh had to move accordingly, and is written to no-op cleanly when Supabase is not configured — which is what keeps guest mode viable.',
          evidence: [
            file('BrandForge', 'src/proxy.ts', 'claude/brandforge-ai-saas-jb4t71'),
            file('BrandForge', 'package.json', 'claude/brandforge-ai-saas-jb4t71', 'next: 16.2.12'),
          ],
        },
      ],
      via: { kind: 'authored' },
    },
    architecture: {
      value:
        'Next.js App Router with server components for the marketing and dashboard shells and client components for the generator flow. Persistence is a swappable layer: Supabase Postgres when configured, local storage otherwise. Export is entirely client-side through jsPDF, so generating a brand kit costs no server time.',
      via: { kind: 'derived', from: [file('BrandForge', 'src/lib', 'claude/brandforge-ai-saas-jb4t71')] },
    },
    outcome: null,
  },

  'email-spam-classifier': {
    problem: {
      value:
        'Text classifiers on TF-IDF features carry tens of thousands of dimensions, most of which contribute nothing. The cost lands twice: training is slower than it needs to be, and the model is far too large to serve on a free-tier host with a few hundred megabytes of memory.',
      via: { kind: 'authored' },
    },
    solution: {
      value:
        'A two-stage hybrid feature selection pipeline. A Chi-Square filter first keeps only terms with a statistically significant relationship to the label; L1-regularised logistic regression then prunes what survives, using the sparsity of the penalty to zero out weak features. The reduced set feeds a compact deep neural network, which is converted to TensorFlow Lite for serving.',
      via: { kind: 'derived', from: [readme('email-spam-classifier'), file('email-spam-classifier', 'spam_hybrid_dl.py')] },
    },
    technologies: {
      value: ['Python', 'TensorFlow', 'Keras', 'TensorFlow Lite', 'scikit-learn', 'pandas', 'NumPy', 'Flask', 'Gunicorn'],
      via: {
        kind: 'derived',
        from: [
          file('email-spam-classifier', 'requirements.txt'),
          { type: 'language', repo: 'email-spam-classifier', name: 'Python', bytes: 16348 },
        ],
      },
    },
    keyFeatures: {
      value: [
        'Chi-Square statistical filtering over TF-IDF features',
        'L1-regularised logistic regression as an embedded selection stage',
        'Deep neural network classifier over the reduced feature space',
        'TensorFlow Lite conversion for low-memory inference',
        'Flask inference API with a browser front end',
      ],
      via: {
        kind: 'derived',
        from: [
          readme('email-spam-classifier'),
          file('email-spam-classifier', 'convert_model.py'),
        ],
      },
    },
    challenges: {
      value: [
        {
          title: 'Fitting a TensorFlow model inside a free-tier memory ceiling',
          detail:
            'Deployment, not accuracy, was the hard part. Full TensorFlow exhausted the host memory limit on load. The path to a working deployment ran through pinning Python 3.10 for runtime compatibility, downgrading to a stable TensorFlow release, cutting dataset loading cost, and finally replacing the training runtime entirely with tflite-runtime for inference — a fraction of the footprint.',
          evidence: [
            commit('email-spam-classifier', '05fea4bddd', 'Set Python runtime to 3.10 for TensorFlow compatibility', '2026-02-22'),
            commit('email-spam-classifier', '1799e96eb3', 'downgrade TensorFlow to stable 2.15.0 for deployment', '2026-02-22'),
            commit('email-spam-classifier', 'a907ee78dc', 'reduce memory usage for render deployment', '2026-03-23'),
            commit('email-spam-classifier', 'edbc04418c', 'used tflite-runtime==2.14.0', '2026-04-11'),
          ],
        },
        {
          title: 'Model weights do not belong in git',
          detail:
            'The trained model and vectoriser were large enough to make the repository painful to clone. They moved to Git LFS, and the sample dataset was later pulled back out of LFS once it was small enough not to need it.',
          evidence: [
            commit('email-spam-classifier', '1d0154e08b', 'track large files with git lfs', '2026-03-22'),
            commit('email-spam-classifier', '3b2346c3c3', 'move dataset and vectorizer to git lfs', '2026-03-22'),
            commit('email-spam-classifier', '6deb3be598', 'Remove spam.csv from LFS', '2026-04-11'),
          ],
        },
        {
          title: 'Training and inference disagreeing on features',
          detail:
            'A later fix corrected a mismatch between the feature space the model was trained on and the one the inference path constructed — the class of bug that leaves a model quietly scoring the wrong thing rather than failing loudly.',
          evidence: [readme('email-spam-classifier', 'Fix broken /sample endpoint and inference/training feature mismatch')],
        },
      ],
      via: { kind: 'authored' },
    },
    architecture: {
      value:
        'Training is a standalone pipeline that writes its artifacts — fitted pipeline, Keras model, metrics and confusion matrix — to a versioned outputs directory. A conversion step emits a TensorFlow Lite model, and the Flask service loads only that, which is what makes serving viable on constrained infrastructure. Training dependencies and serving dependencies are split so the deployed image never installs TensorFlow.',
      via: {
        kind: 'derived',
        from: [file('email-spam-classifier', 'convert_model.py'), file('email-spam-classifier', 'Procfile', 'main', 'web: gunicorn backend.app:app')],
      },
    },
    outcome: {
      value: {
        summary:
          'Evaluated on a held-out set of 16,690 messages. The recall figure is the one that matters for spam: 0.9929 means roughly 7 in 1,000 spam messages reach the inbox.',
        metrics: [
          { label: 'Accuracy', value: '98.49%', source: file('email-spam-classifier', 'outputs_dl/metrics.json') },
          { label: 'Precision', value: '97.87%', source: file('email-spam-classifier', 'outputs_dl/metrics.json') },
          { label: 'Recall', value: '99.29%', source: file('email-spam-classifier', 'outputs_dl/metrics.json') },
          { label: 'F1', value: '98.58%', source: file('email-spam-classifier', 'outputs_dl/metrics.json') },
          { label: 'ROC AUC', value: '99.80%', source: file('email-spam-classifier', 'outputs_dl/metrics.json') },
          { label: 'Test samples', value: '16,690', source: file('email-spam-classifier', 'outputs_dl/report.txt') },
        ],
      },
      via: { kind: 'derived', from: [file('email-spam-classifier', 'outputs_dl/metrics.json')] },
    },
  },

  'career-recommender': {
    problem: {
      value:
        'Career guidance for undergraduates is either a personality quiz with no path attached, or a counsellor conversation that does not scale. Neither tells a student the specific gap between where they are and the role they want.',
      via: { kind: 'authored' },
    },
    solution: {
      value:
        'A short interest assessment scored against a curated question-to-career weight map, returning ranked matches with a percentage score, then a skill-gap analysis naming exactly which skills are still missing. Version one is deliberately rule-based rather than learned: identical answers always produce identical recommendations, and every score can be traced back to the weights that produced it.',
      via: { kind: 'derived', from: [readme('Career-Recommender')] },
    },
    technologies: {
      value: ['Python', 'Flask', 'PostgreSQL', 'SQLAlchemy', 'pandas', 'Bootstrap 5', 'Jinja2', 'Docker', 'pytest'],
      via: { kind: 'derived', from: [readme('Career-Recommender', 'Technology stack')] },
    },
    keyFeatures: {
      value: [
        '35-question interest assessment on a 5-point Likert scale',
        'Ranked matches across 42 careers in 6 domains, scored by weighted mapping',
        'Skill-gap analysis with a readiness score and named missing skills',
        'Assessment history persisted per user',
        'Email and password auth with optional Google OAuth',
      ],
      via: { kind: 'derived', from: [readme('Career-Recommender', 'What it does')] },
    },
    challenges: {
      value: [
        {
          title: 'Skill matching that failed on capitalisation',
          detail:
            'Skill-gap analysis compares two lists of human-entered strings, so "Python" and "python" read as different skills and inflated the gap. Fixed alongside a Docker deploy path error and text encoding bugs, with a pytest suite added in the same pass to hold the behaviour.',
          evidence: [
            commit('Career-Recommender', 'cdfbe2d5c3', 'Add pytest test suite; fix Docker deploy path, case-sensitive skill matching, and encoding bugs', '2026-07-08'),
          ],
        },
        {
          title: 'Containerising for a fixed-port host',
          detail:
            'Hugging Face Spaces expects the container to serve on port 7860, which is not Flask\'s default and not what local development uses. The Docker configuration and server port were aligned so the same image runs locally and in the Space.',
          evidence: [
            commit('Career-Recommender', 'deb7cef8d9', 'Configure Docker and server port for Hugging Face deployment', '2026-06-19'),
          ],
        },
      ],
      via: { kind: 'authored' },
    },
    architecture: {
      value:
        'A Flask application split into five route blueprints over a service layer that owns dataset loading, recommendation scoring and skill-gap computation. Data sits in managed PostgreSQL through SQLAlchemy. The whole thing is containerised and deployed to Hugging Face Spaces.',
      via: { kind: 'derived', from: [readme('Career-Recommender', 'Project structure')] },
    },
    outcome: null,
  },

  'teniola-graduation-tribute': {
    problem: {
      value:
        'A graduation tribute is usually a photo carousel with a caption. The brief here was something a person would actually keep — a gift that reads as designed rather than generated.',
      via: { kind: 'authored' },
    },
    solution: {
      value:
        'A single-page site built as a newspaper front page. Broadsheet typography and a gold ticker carry the masthead, sections read as columns and features, and the colophon closes with a code box that bursts confetti when you compile it. Hand-written HTML, CSS and JavaScript, no framework.',
      via: { kind: 'derived', from: [readme('teniola-graduation-tribute')] },
    },
    technologies: {
      value: ['HTML', 'CSS', 'JavaScript'],
      via: {
        kind: 'derived',
        from: [
          { type: 'language', repo: 'teniola-graduation-tribute', name: 'CSS', bytes: 54297 },
          { type: 'language', repo: 'teniola-graduation-tribute', name: 'JavaScript', bytes: 26488 },
        ],
      },
    },
    keyFeatures: {
      value: [
        'Newspaper masthead with a scrolling gold ticker',
        'Floating glass pill navigation with theme and sound toggles',
        'Compile-to-confetti interaction in the colophon',
        'Light and dark treatments',
      ],
      via: { kind: 'derived', from: [readme('teniola-graduation-tribute', "What's fixed in this patch")] },
    },
    challenges: {
      value: [
        {
          title: 'Images that were never really JPEGs',
          detail:
            'Two photos rendered as broken images for almost every visitor. They were HEIC files saved with a .jpg extension — a container almost no browser decodes, and one that nothing in the build surfaces as an error. Both were re-encoded as real JPEGs.',
          evidence: [readme('teniola-graduation-tribute', 'Fixed two genuinely broken photos')],
        },
        {
          title: 'A full-height hero that did not fit the screen',
          detail:
            'The call to action sat below the fold on ordinary laptops. The cause was structural: a ticker in normal document flow with a top margin, stacked under a separately fixed masthead, silently added around 110px above a 100vh hero. Folding the ticker into the same fixed row reclaimed the space.',
          evidence: [readme('teniola-graduation-tribute', 'Hero now fits the actual screen')],
        },
      ],
      via: { kind: 'authored' },
    },
    architecture: null,
    outcome: null,
  },

  lammydeart: {
    problem: {
      value:
        'Design work is judged on presentation. A portfolio that renders slowly, or crops the work badly, actively undersells what it is showing.',
      via: { kind: 'authored' },
    },
    solution: {
      value:
        'A dark, image-forward catalogue where the work is the interface. Projects are grouped into their own folders with a consistent palette, a flagship image anchors the home page, and a height-capped lightbox shows each piece without letting tall artwork push the layout around.',
      via: { kind: 'authored' },
    },
    technologies: {
      value: ['JavaScript', 'Vite', 'CSS', 'HTML'],
      via: {
        kind: 'derived',
        from: [
          { type: 'language', repo: 'Lammydeart', name: 'JavaScript', bytes: 114230 },
          { type: 'deployment', url: 'https://thelammydeart.vercel.app', date: '2026-07-28' },
        ],
      },
    },
    keyFeatures: {
      value: [
        'Image-led project grid with per-project folders',
        'Height-capped lightbox for full-resolution viewing',
        'Flagship hero treatment with grounded shadow',
        'Reordered, compact mobile layout with larger touch targets',
      ],
      via: {
        kind: 'derived',
        from: [
          commit('Lammydeart', '8421354788', 'refactor: per-project image folders, consistent palette, 404 route, contact content', '2026-07-25'),
          commit('Lammydeart', 'a5cbec797a', 'Mobile hero reorder + compact sizing, 2-col project grid, image-backed services', '2026-07-19'),
        ],
      },
    },
    challenges: {
      value: [
        {
          title: 'Shipping six megabytes of artwork nobody could see',
          detail:
            'A catalogue refresh brought in 18 images at up to 1700px and 6.11MB total. Nothing displayed anywhere near that size — grid cards render around 420px wide on desktop and 170px on a phone, and the lightbox is capped at 65vh. Re-encoding the set at 1200px on the long edge with progressive mozjpeg cut the payload to 2.73MB, a 55% reduction, and the crops were checked at display size rather than assumed to be fine.',
          evidence: [
            commit('Lammydeart', '5efe1ee01e', 'perf: halve the image payload and stop lazy-loading the hero', '2026-07-28'),
          ],
        },
        {
          title: 'A hero image that read as a tilted card',
          detail:
            'The flagship image was meant to look like it was lying on a floor, and instead read as a rotated rectangle floating in space. It took several passes on tilt and shadow grounding before the perspective was convincing.',
          evidence: [
            commit('Lammydeart', '17be4c1367', 'tweak: stronger floor-tilt and grounded shadow on hero flagship image', '2026-07-23'),
            commit('Lammydeart', 'c4e3c9f471', 'fix: hero image now reads as lying on the floor, not a tilted card', '2026-07-23'),
          ],
        },
      ],
      via: { kind: 'authored' },
    },
    architecture: null,
    outcome: null,
  },
};
