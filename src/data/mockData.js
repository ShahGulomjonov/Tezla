// Rich mock data simulating AI pipeline output for Tezla prototype

const CHARACTER_COLORS = {
  'sarah': '#6366f1',
  'james': '#f59e0b',
  'elena': '#ec4899',
  'marcus': '#22c55e',
  'dr-chen': '#3b82f6',
  'detective': '#ef4444',
  'operator': '#8b5cf6',
  'lily': '#14b8a6',
};

export const projects = [
  {
    id: 'proj-001',
    title: 'The Last Signal',
    genre: 'Sci-Fi Thriller',
    runtime: '1:02:14',
    runtimeSeconds: 3734,
    condensedDuration: '15:00',
    condensedSeconds: 900,
    director: 'Marina Volkov',
    rating: 'PG-13',
    language: 'English',
    year: 2024,
    status: 'ready',
    confidence: 0.92,
    thumbnailGradient: 'linear-gradient(135deg, #1a1a3e 0%, #2d1b4e 30%, #1a2d4e 70%, #0f1a2e 100%)',
    narrativeRetention: 0.94,
    compressionRatio: 0.76,
    processedAt: '2025-02-26T14:32:00Z',
    scenes: generateScenes('sci-fi'),
  },
  {
    id: 'proj-002',
    title: 'Midnight in Lisbon',
    genre: 'Romance Drama',
    runtime: '0:58:32',
    runtimeSeconds: 3512,
    condensedDuration: '14:30',
    condensedSeconds: 870,
    director: 'Carlos Mendes',
    rating: 'R',
    language: 'English / Portuguese',
    year: 2024,
    status: 'ready',
    confidence: 0.88,
    thumbnailGradient: 'linear-gradient(135deg, #2d1b1b 0%, #4e2d1b 30%, #3e1b2d 70%, #1a0f1a 100%)',
    narrativeRetention: 0.91,
    compressionRatio: 0.75,
    processedAt: '2025-02-25T09:15:00Z',
    scenes: generateScenes('romance'),
  },
  {
    id: 'proj-003',
    title: 'Code Zero',
    genre: 'Action Thriller',
    runtime: '1:05:48',
    runtimeSeconds: 3948,
    condensedDuration: '15:00',
    condensedSeconds: 900,
    director: 'Jake Morrison',
    rating: 'R',
    language: 'English',
    year: 2025,
    status: 'processing',
    confidence: 0.78,
    thumbnailGradient: 'linear-gradient(135deg, #1a0f0f 0%, #2d1a1a 30%, #4e1a1a 70%, #1a0f0f 100%)',
    narrativeRetention: 0.85,
    compressionRatio: 0.77,
    processedAt: null,
    scenes: generateScenes('action'),
  },
  {
    id: 'proj-004',
    title: 'The Quiet Garden',
    genre: 'Drama',
    runtime: '0:54:20',
    runtimeSeconds: 3260,
    condensedDuration: '13:30',
    condensedSeconds: 810,
    director: 'Yuki Tanaka',
    rating: 'PG',
    language: 'English / Japanese',
    year: 2024,
    status: 'exported',
    confidence: 0.95,
    thumbnailGradient: 'linear-gradient(135deg, #0f1a0f 0%, #1a2d1a 30%, #1b3e1b 70%, #0f1a0f 100%)',
    narrativeRetention: 0.96,
    compressionRatio: 0.75,
    processedAt: '2025-02-20T18:45:00Z',
    scenes: generateScenes('drama'),
  },
  {
    id: 'proj-005',
    title: 'Echoes of Tomorrow',
    genre: 'Sci-Fi Drama',
    runtime: '1:01:05',
    runtimeSeconds: 3665,
    condensedDuration: '15:00',
    condensedSeconds: 900,
    director: 'Ava Chen',
    rating: 'PG-13',
    language: 'English',
    year: 2025,
    status: 'ready',
    confidence: 0.90,
    thumbnailGradient: 'linear-gradient(135deg, #0f0f2e 0%, #1b1b4e 30%, #2d1b4e 70%, #0f0f1a 100%)',
    narrativeRetention: 0.93,
    compressionRatio: 0.75,
    processedAt: '2025-02-24T11:20:00Z',
    scenes: generateScenes('sci-fi'),
  },
];

function generateScenes(genre) {
  const sceneTemplates = {
    'sci-fi': [
      { id: 's01', label: 'Opening', description: 'Establishing shot: space station orbiting Earth', rationale: 'Sets the world and tone', importance: 0.85, confidence: 0.94, start: '00:00:00', end: '00:02:45', characters: ['sarah', 'james'], emotions: ['wonder', 'tension'], status: 'keep', transition: 'dissolve', narrativePhase: 'beginning' },
      { id: 's02', label: 'Lab Discovery', description: 'Dr. Sarah discovers anomalous signal in deep space scan', rationale: 'Inciting incident — key plot point', importance: 0.95, confidence: 0.97, start: '00:02:45', end: '00:05:30', characters: ['sarah', 'dr-chen'], emotions: ['surprise', 'curiosity'], status: 'keep', transition: 'cut', narrativePhase: 'beginning' },
      { id: 's03', label: 'Coffee Break', description: 'Casual conversation in the cafeteria about personal life', rationale: 'Low info density, filler', importance: 0.25, confidence: 0.91, start: '00:05:30', end: '00:07:15', characters: ['sarah', 'james'], emotions: ['neutral'], status: 'cut', transition: 'cut', narrativePhase: 'beginning' },
      { id: 's04', label: 'Briefing', description: 'Station commander briefs team on signal analysis protocol', rationale: 'Exposition — needed for context', importance: 0.72, confidence: 0.88, start: '00:07:15', end: '00:10:00', characters: ['sarah', 'james', 'marcus'], emotions: ['serious'], status: 'keep', transition: 'cut', narrativePhase: 'beginning' },
      { id: 's05', label: 'Signal Decoded', description: 'AI decodes partial message from the signal — coordinates', rationale: 'Major plot advancement', importance: 0.92, confidence: 0.95, start: '00:10:00', end: '00:13:20', characters: ['sarah', 'dr-chen'], emotions: ['excitement', 'fear'], status: 'keep', transition: 'dissolve', narrativePhase: 'middle' },
      { id: 's06', label: 'Corridor Walk', description: 'Sarah walks through station corridor reflecting', rationale: 'Atmospheric but low info', importance: 0.30, confidence: 0.85, start: '00:13:20', end: '00:14:50', characters: ['sarah'], emotions: ['contemplation'], status: 'cut', transition: 'cut', narrativePhase: 'middle' },
      { id: 's07', label: 'Argument', description: 'James argues with Marcus about risking the mission', rationale: 'Character conflict — emotional peak', importance: 0.88, confidence: 0.93, start: '00:14:50', end: '00:18:00', characters: ['james', 'marcus'], emotions: ['anger', 'tension'], status: 'keep', transition: 'cut', narrativePhase: 'middle' },
      { id: 's08', label: 'Secret Comm', description: 'Sarah secretly contacts Earth about the signal', rationale: 'Plot twist setup', importance: 0.90, confidence: 0.91, start: '00:18:00', end: '00:20:30', characters: ['sarah', 'operator'], emotions: ['secrecy', 'urgency'], status: 'keep', transition: 'cut', narrativePhase: 'middle' },
      { id: 's09', label: 'Maintenance', description: 'Routine maintenance scene on the station exterior', rationale: 'Visual filler, no plot', importance: 0.15, confidence: 0.92, start: '00:20:30', end: '00:22:00', characters: ['james'], emotions: ['calm'], status: 'cut', transition: 'cut', narrativePhase: 'middle' },
      { id: 's10', label: 'System Failure', description: 'Station systems begin failing one by one after signal', rationale: 'Rising tension — midpoint crisis', importance: 0.94, confidence: 0.96, start: '00:22:00', end: '00:26:30', characters: ['sarah', 'james', 'marcus', 'dr-chen'], emotions: ['panic', 'urgency'], status: 'keep', transition: 'cut', narrativePhase: 'middle' },
      { id: 's11', label: 'Quiet Moment', description: 'Sarah and James share a quiet moment amid chaos', rationale: 'Emotional beat — character depth', importance: 0.68, confidence: 0.87, start: '00:26:30', end: '00:28:15', characters: ['sarah', 'james'], emotions: ['tenderness', 'fear'], status: 'keep', transition: 'dissolve', narrativePhase: 'middle' },
      { id: 's12', label: 'Alarm Sequence', description: 'Multiple alarms trigger, crew scrambles', rationale: 'Redundant with s10 tension', importance: 0.35, confidence: 0.83, start: '00:28:15', end: '00:30:00', characters: ['marcus'], emotions: ['panic'], status: 'cut', transition: 'cut', narrativePhase: 'middle' },
      { id: 's13', label: 'Revelation', description: 'Signal decoded fully — it is a warning from the future', rationale: 'Major reveal — climax setup', importance: 0.98, confidence: 0.98, start: '00:30:00', end: '00:34:00', characters: ['sarah', 'dr-chen', 'james'], emotions: ['shock', 'disbelief'], status: 'keep', transition: 'cut', narrativePhase: 'middle' },
      { id: 's14', label: 'Crew Debate', description: 'Full crew debates whether to act on the warning', rationale: 'Ethical dilemma — key dialogue', importance: 0.85, confidence: 0.90, start: '00:34:00', end: '00:38:00', characters: ['sarah', 'james', 'marcus', 'dr-chen'], emotions: ['conflict', 'determination'], status: 'keep', transition: 'cut', narrativePhase: 'middle' },
      { id: 's15', label: 'Sleep Quarter', description: 'Sarah alone in quarters processing everything', rationale: 'Pacing — but low info', importance: 0.32, confidence: 0.86, start: '00:38:00', end: '00:39:30', characters: ['sarah'], emotions: ['isolation'], status: 'cut', transition: 'cut', narrativePhase: 'middle' },
      { id: 's16', label: 'EVA Mission', description: 'Crew performs dangerous EVA to adjust antenna', rationale: 'High-stakes action sequence', importance: 0.91, confidence: 0.94, start: '00:39:30', end: '00:44:00', characters: ['james', 'marcus'], emotions: ['danger', 'bravery'], status: 'keep', transition: 'cut', narrativePhase: 'end' },
      { id: 's17', label: 'Sacrifice', description: 'Marcus sacrifices himself to complete the EVA repair', rationale: 'Emotional climax — key beat', importance: 0.97, confidence: 0.97, start: '00:44:00', end: '00:48:30', characters: ['james', 'marcus', 'sarah'], emotions: ['grief', 'heroism'], status: 'keep', transition: 'dissolve', narrativePhase: 'end' },
      { id: 's18', label: 'Aftermath', description: 'Station stabilizes, crew mourns Marcus', rationale: 'Emotional resolution', importance: 0.78, confidence: 0.89, start: '00:48:30', end: '00:51:00', characters: ['sarah', 'james', 'dr-chen'], emotions: ['grief', 'relief'], status: 'keep', transition: 'dissolve', narrativePhase: 'end' },
      { id: 's19', label: 'Corridor 2', description: 'Another corridor walking scene with minor dialogue', rationale: 'Filler, no new info', importance: 0.20, confidence: 0.90, start: '00:51:00', end: '00:52:30', characters: ['sarah'], emotions: ['melancholy'], status: 'cut', transition: 'cut', narrativePhase: 'end' },
      { id: 's20', label: 'Reply Sent', description: 'Sarah sends reply into deep space, open-ended resolution', rationale: 'Final beat — story closure', importance: 0.93, confidence: 0.96, start: '00:52:30', end: '00:55:00', characters: ['sarah', 'james'], emotions: ['hope', 'bittersweet'], status: 'keep', transition: 'dissolve', narrativePhase: 'end' },
      { id: 's21', label: 'Credits Pan', description: 'Slow pan of the station as credits begin', rationale: 'End credits, not needed', importance: 0.10, confidence: 0.95, start: '00:55:00', end: '00:58:00', characters: [], emotions: ['closure'], status: 'cut', transition: 'cut', narrativePhase: 'end' },
      { id: 's22', label: 'Post-Credits', description: 'A second signal appears — sequel tease', rationale: 'Sequel hook — audience retention', importance: 0.82, confidence: 0.88, start: '00:58:00', end: '01:00:00', characters: [], emotions: ['mystery', 'excitement'], status: 'keep', transition: 'cut', narrativePhase: 'end' },
    ],
    'romance': [
      { id: 's01', label: 'Lisbon Morning', description: 'Elena walks through Lisbon streets at dawn', rationale: 'Sets location and mood', importance: 0.80, confidence: 0.92, start: '00:00:00', end: '00:02:30', characters: ['elena'], emotions: ['nostalgia', 'beauty'], status: 'keep', transition: 'dissolve', narrativePhase: 'beginning' },
      { id: 's02', label: 'Café Meeting', description: 'Elena meets James at a café — first conversation', rationale: 'Inciting incident — meet-cute', importance: 0.95, confidence: 0.96, start: '00:02:30', end: '00:06:00', characters: ['elena', 'james'], emotions: ['charm', 'curiosity'], status: 'keep', transition: 'cut', narrativePhase: 'beginning' },
      { id: 's03', label: 'Walking Tour', description: 'They explore Alfama district together', rationale: 'Relationship building', importance: 0.70, confidence: 0.88, start: '00:06:00', end: '00:10:00', characters: ['elena', 'james'], emotions: ['joy', 'connection'], status: 'keep', transition: 'dissolve', narrativePhase: 'beginning' },
      { id: 's04', label: 'Tram Ride', description: 'Scenic tram ride with casual banter', rationale: 'Atmospheric filler', importance: 0.30, confidence: 0.85, start: '00:10:00', end: '00:12:00', characters: ['elena', 'james'], emotions: ['lighthearted'], status: 'cut', transition: 'cut', narrativePhase: 'middle' },
      { id: 's05', label: 'The Secret', description: 'Elena reveals she is leaving Lisbon tomorrow', rationale: 'Key twist — stakes raised', importance: 0.93, confidence: 0.95, start: '00:12:00', end: '00:16:00', characters: ['elena', 'james'], emotions: ['sadness', 'urgency'], status: 'keep', transition: 'cut', narrativePhase: 'middle' },
      { id: 's06', label: 'Sunset View', description: 'They watch sunset from Miradouro da Graça', rationale: 'Emotional intensity — core moment', importance: 0.90, confidence: 0.93, start: '00:16:00', end: '00:20:00', characters: ['elena', 'james'], emotions: ['romance', 'melancholy'], status: 'keep', transition: 'dissolve', narrativePhase: 'middle' },
      { id: 's07', label: 'Fado Night', description: 'They attend a Fado performance in a small bar', rationale: 'Cultural moment — emotional music', importance: 0.75, confidence: 0.87, start: '00:20:00', end: '00:24:00', characters: ['elena', 'james'], emotions: ['saudade', 'intimacy'], status: 'keep', transition: 'dissolve', narrativePhase: 'middle' },
      { id: 's08', label: 'Phone Call', description: 'Elena takes a call — argument with someone back home', rationale: 'Backstory reveal', importance: 0.82, confidence: 0.89, start: '00:24:00', end: '00:27:00', characters: ['elena'], emotions: ['frustration', 'vulnerability'], status: 'keep', transition: 'cut', narrativePhase: 'middle' },
      { id: 's09', label: 'Night Walk', description: 'Walking through empty streets at night', rationale: 'Pacing scene, low info', importance: 0.28, confidence: 0.84, start: '00:27:00', end: '00:29:00', characters: ['elena', 'james'], emotions: ['contemplation'], status: 'cut', transition: 'cut', narrativePhase: 'middle' },
      { id: 's10', label: 'Confrontation', description: 'James confronts Elena about her avoidance', rationale: 'Emotional climax', importance: 0.96, confidence: 0.97, start: '00:29:00', end: '00:34:00', characters: ['elena', 'james'], emotions: ['anger', 'vulnerability', 'love'], status: 'keep', transition: 'cut', narrativePhase: 'end' },
      { id: 's11', label: 'Airport', description: 'Elena at the airport — departure gate', rationale: 'Resolution setup', importance: 0.88, confidence: 0.91, start: '00:34:00', end: '00:38:00', characters: ['elena'], emotions: ['sadness', 'longing'], status: 'keep', transition: 'cut', narrativePhase: 'end' },
      { id: 's12', label: 'Return', description: 'Elena returns — finds James at the café', rationale: 'Resolution — key beat', importance: 0.94, confidence: 0.96, start: '00:38:00', end: '00:42:00', characters: ['elena', 'james'], emotions: ['hope', 'love'], status: 'keep', transition: 'dissolve', narrativePhase: 'end' },
    ],
    'action': [
      { id: 's01', label: 'Cold Open', description: 'High-speed car chase through downtown', rationale: 'Hook — grabs attention', importance: 0.88, confidence: 0.93, start: '00:00:00', end: '00:03:30', characters: ['detective'], emotions: ['adrenaline'], status: 'keep', transition: 'cut', narrativePhase: 'beginning' },
      { id: 's02', label: 'Precinct', description: 'Detective arrives at precinct, gets briefed on case', rationale: 'Setup — case introduction', importance: 0.82, confidence: 0.90, start: '00:03:30', end: '00:07:00', characters: ['detective', 'marcus'], emotions: ['determination'], status: 'keep', transition: 'cut', narrativePhase: 'beginning' },
      { id: 's03', label: 'Evidence Room', description: 'Reviewing evidence from previous raids', rationale: 'Exposition — context', importance: 0.65, confidence: 0.85, start: '00:07:00', end: '00:10:00', characters: ['detective'], emotions: ['focus'], status: 'keep', transition: 'cut', narrativePhase: 'beginning' },
      { id: 's04', label: 'Stake-out', description: 'Long surveillance scene outside warehouse', rationale: 'Pacing filler', importance: 0.25, confidence: 0.88, start: '00:10:00', end: '00:13:00', characters: ['detective', 'marcus'], emotions: ['boredom', 'alert'], status: 'cut', transition: 'cut', narrativePhase: 'middle' },
      { id: 's05', label: 'Raid', description: 'Police raid on the warehouse', rationale: 'Key action sequence', importance: 0.94, confidence: 0.95, start: '00:13:00', end: '00:19:00', characters: ['detective', 'marcus'], emotions: ['danger', 'adrenaline'], status: 'keep', transition: 'cut', narrativePhase: 'middle' },
      { id: 's06', label: 'Interrogation', description: 'Detective interrogates a captured suspect', rationale: 'Plot reveal — clue found', importance: 0.90, confidence: 0.92, start: '00:19:00', end: '00:24:00', characters: ['detective'], emotions: ['intensity', 'cunning'], status: 'keep', transition: 'cut', narrativePhase: 'middle' },
      { id: 's07', label: 'Drive Home', description: 'Detective drives home, mundane scene', rationale: 'Transition scene, low info', importance: 0.20, confidence: 0.87, start: '00:24:00', end: '00:25:30', characters: ['detective'], emotions: ['fatigue'], status: 'cut', transition: 'cut', narrativePhase: 'middle' },
      { id: 's08', label: 'Betrayal', description: 'Partner revealed to be working against detective', rationale: 'Major twist — climax', importance: 0.97, confidence: 0.96, start: '00:25:30', end: '00:31:00', characters: ['detective', 'marcus'], emotions: ['shock', 'betrayal'], status: 'keep', transition: 'cut', narrativePhase: 'middle' },
      { id: 's09', label: 'Chase', description: 'Foot chase through subway system', rationale: 'Action climax sequence', importance: 0.93, confidence: 0.94, start: '00:31:00', end: '00:37:00', characters: ['detective', 'marcus'], emotions: ['danger', 'determination'], status: 'keep', transition: 'cut', narrativePhase: 'end' },
      { id: 's10', label: 'Showdown', description: 'Final confrontation on rooftop', rationale: 'Resolution climax', importance: 0.96, confidence: 0.97, start: '00:37:00', end: '00:43:00', characters: ['detective', 'marcus'], emotions: ['tension', 'justice'], status: 'keep', transition: 'dissolve', narrativePhase: 'end' },
      { id: 's11', label: 'Aftermath', description: 'Detective at precinct next morning', rationale: 'Resolution wrap-up', importance: 0.70, confidence: 0.88, start: '00:43:00', end: '00:46:00', characters: ['detective'], emotions: ['relief', 'bittersweet'], status: 'keep', transition: 'dissolve', narrativePhase: 'end' },
    ],
    'drama': [
      { id: 's01', label: 'Garden Dawn', description: 'Old woman tending her garden as sun rises', rationale: 'Sets character and world', importance: 0.82, confidence: 0.93, start: '00:00:00', end: '00:03:00', characters: ['lily'], emotions: ['peace', 'nostalgia'], status: 'keep', transition: 'dissolve', narrativePhase: 'beginning' },
      { id: 's02', label: 'Letter', description: 'Lily receives a letter from her estranged daughter', rationale: 'Inciting incident', importance: 0.94, confidence: 0.96, start: '00:03:00', end: '00:06:30', characters: ['lily'], emotions: ['surprise', 'pain'], status: 'keep', transition: 'cut', narrativePhase: 'beginning' },
      { id: 's03', label: 'Neighbor Chat', description: 'Lily chats with neighbor about weather', rationale: 'Filler dialogue', importance: 0.20, confidence: 0.89, start: '00:06:30', end: '00:08:00', characters: ['lily'], emotions: ['mundane'], status: 'cut', transition: 'cut', narrativePhase: 'beginning' },
      { id: 's04', label: 'Flashback', description: 'Memory of daughter leaving home years ago', rationale: 'Key backstory reveal', importance: 0.91, confidence: 0.92, start: '00:08:00', end: '00:12:00', characters: ['lily', 'elena'], emotions: ['regret', 'hurt'], status: 'keep', transition: 'dissolve', narrativePhase: 'middle' },
      { id: 's05', label: 'Decision', description: 'Lily decides to write back and travel to see daughter', rationale: 'Key character decision', importance: 0.88, confidence: 0.91, start: '00:12:00', end: '00:15:30', characters: ['lily'], emotions: ['determination', 'fear'], status: 'keep', transition: 'cut', narrativePhase: 'middle' },
      { id: 's06', label: 'Train Ride', description: 'Long train journey scene with scenery', rationale: 'Atmospheric — minimal info', importance: 0.30, confidence: 0.85, start: '00:15:30', end: '00:18:00', characters: ['lily'], emotions: ['contemplation'], status: 'cut', transition: 'cut', narrativePhase: 'middle' },
      { id: 's07', label: 'Reunion', description: 'Lily arrives and meets daughter after years', rationale: 'Emotional climax — core scene', importance: 0.97, confidence: 0.98, start: '00:18:00', end: '00:24:00', characters: ['lily', 'elena'], emotions: ['tears', 'love', 'tension'], status: 'keep', transition: 'cut', narrativePhase: 'middle' },
      { id: 's08', label: 'Dinner', description: 'Awkward family dinner, grandson introduced', rationale: 'Character development', importance: 0.72, confidence: 0.87, start: '00:24:00', end: '00:28:00', characters: ['lily', 'elena'], emotions: ['awkward', 'warmth'], status: 'keep', transition: 'cut', narrativePhase: 'middle' },
      { id: 's09', label: 'Night Talk', description: 'Lily and Elena finally speak openly on the porch', rationale: 'Most important dialogue', importance: 0.96, confidence: 0.97, start: '00:28:00', end: '00:34:00', characters: ['lily', 'elena'], emotions: ['honesty', 'healing', 'tears'], status: 'keep', transition: 'dissolve', narrativePhase: 'end' },
      { id: 's10', label: 'Morning After', description: 'Breakfast together, lighter mood', rationale: 'Resolution — relationship healed', importance: 0.80, confidence: 0.90, start: '00:34:00', end: '00:37:00', characters: ['lily', 'elena'], emotions: ['hope', 'family'], status: 'keep', transition: 'dissolve', narrativePhase: 'end' },
      { id: 's11', label: 'Garden End', description: 'Lily tends the garden again — but now with Elena', rationale: 'Circular ending — poetic closure', importance: 0.90, confidence: 0.95, start: '00:37:00', end: '00:40:00', characters: ['lily', 'elena'], emotions: ['peace', 'love'], status: 'keep', transition: 'dissolve', narrativePhase: 'end' },
    ],
  };
  return sceneTemplates[genre] || sceneTemplates['sci-fi'];
}

export const qcReports = {
  'proj-001': {
    subtitleSync: { status: 'pass', value: '42ms avg drift', label: 'Subtitle Sync' },
    audioClipping: { status: 'pass', value: 'No clipping detected', label: 'Audio Clipping' },
    resolution: { status: 'pass', value: '1920x1080 H.264', label: 'Resolution / Codec' },
    bitrate: { status: 'pass', value: '8.2 Mbps avg', label: 'Bitrate' },
    framerate: { status: 'pass', value: '23.976 fps constant', label: 'Frame Rate' },
    characterGap: { status: 'warning', value: 'Sarah absent 85s (s06-s07)', label: 'Character Gap' },
    narrativeFlow: { status: 'pass', value: 'All 3 acts represented', label: 'Narrative Flow' },
    contentWarning: { status: 'pass', value: 'PG-13 rating preserved', label: 'Content Rating' },
  },
};

export const CHARACTER_COLOR_MAP = CHARACTER_COLORS;

export function getImportanceColor(score) {
  if (score >= 0.9) return 'var(--importance-critical)';
  if (score >= 0.7) return 'var(--importance-high)';
  if (score >= 0.5) return 'var(--importance-medium)';
  if (score >= 0.3) return 'var(--importance-low)';
  return 'var(--importance-skip)';
}

export function getImportanceLabel(score) {
  if (score >= 0.9) return 'Critical';
  if (score >= 0.7) return 'High';
  if (score >= 0.5) return 'Medium';
  if (score >= 0.3) return 'Low';
  return 'Skip';
}

export function formatTimestamp(ts) {
  return ts;
}

export function getStatusInfo(status) {
  switch (status) {
    case 'processing': return { label: 'Processing', className: 'badge-warning' };
    case 'ready': return { label: 'Ready', className: 'badge-info' };
    case 'exported': return { label: 'Exported', className: 'badge-success' };
    default: return { label: status, className: 'badge-info' };
  }
}
