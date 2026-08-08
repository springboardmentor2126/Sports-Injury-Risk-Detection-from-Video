// Dataset Information & AI Model Benchmarks (Milestone 1 Specification)

export const DATASETS = [
  {
    id: 'human36m',
    name: 'Human3.6M Dataset',
    category: '3D Human Pose Estimation',
    numSamples: '3.6 Million 3D Frames',
    actors: 11,
    scenarios: 15,
    keypoints: '32 3D Joint Annotations',
    relevance: 'Gold standard for precise 3D joint coordinate calculation, joint angle tracking (knee valgus, trunk lean, hip flexion), and spatial trajectory reconstruction.',
    metrics: {
      mpjpe: '38.4 mm (Mean Per Joint Position Error)',
      p_mpjpe: '31.2 mm (Procrustes-Aligned MPJPE)'
    },
    sampleTypes: ['Walking', 'Eating', 'Smoking', 'Discussion', 'Directions', 'Greeting', 'Phoning', 'Posing', 'Purchasing', 'Sitting', 'Waiting', 'Walking Dog', 'Walking Together']
  },
  {
    id: 'mpii',
    name: 'MPII Human Pose Dataset',
    category: '2D Pose & Motion Analysis',
    numSamples: '25,000 Images (40,000 Subjects)',
    keypoints: '16 Body Joint Annotations',
    relevance: 'Includes full-body annotations covering hundreds of athletic activities with high variation in body orientation, occlusion, and fast movement blur.',
    metrics: {
      pckh: '92.4% (Percentage of Correct Keypoints @ head 0.5 threshold)'
    },
    sampleTypes: ['Bicycle riding', 'Running', 'Gymnastics', 'Basketball', 'Soccer tackle', 'Weightlifting']
  },
  {
    id: 'coco',
    name: 'COCO Keypoints Dataset',
    category: 'Multi-Person 2D Skeleton Detection',
    numSamples: '200,000 Images / 250,000 Person Instances',
    keypoints: '17 COCO Standard Keypoints',
    relevance: 'Standardized skeleton keypoints format (Nose, Eyes, Ears, Shoulders, Elbows, Wrists, Hips, Knees, Ankles) used for lightweight real-time video stream detection.',
    metrics: {
      map: '76.8% mAP (Mean Average Precision @ IoU 0.50:0.95)'
    },
    sampleTypes: ['In-the-wild athletic events', 'Multi-player matches', 'Outdoor sports']
  },
  {
    id: 'sportspose',
    name: 'SportsPose Dataset',
    category: 'Dynamic Athletic Movement',
    numSamples: '175,000 Frames across 24 Athletes',
    keypoints: '3D High-Speed Markerless Pose Data',
    relevance: 'Purpose-built dataset focused specifically on high-velocity sports movements (jumping, cutting, sprinting, kicking, throwing) captured with high-speed cameras.',
    metrics: {
      angleError: '2.1° Joint Angle Error',
      forceCorrelation: 'r = 0.92 GRF (Ground Reaction Force Correlation)'
    },
    sampleTypes: ['Sidestep Cutting', 'Single Leg Landing', 'Countermovement Jump', 'Bounding', 'Sprint Acceleration']
  },
  {
    id: 'fifa',
    name: 'FIFA Medical & Injury Dataset (Reference)',
    category: 'Epidemiological & Clinical Injury Logs',
    numSamples: '12,000 Pro Football Injury Incidents',
    relevance: 'Provides epidemiological baseline data linking specific biomechanical risk indicators (e.g. dynamic knee valgus > 15°) with clinical incidence rates of ACL, hamstring, and groin injuries.',
    metrics: {
      predictiveAccuracy: '84.6% Sensitivity for Non-Contact Injury Risk'
    },
    sampleTypes: ['ACL Ligament Tears', 'Hamstring Strain Grade 1-3', 'Ankle Inversion Sprain', 'Adductor Strain']
  }
];
