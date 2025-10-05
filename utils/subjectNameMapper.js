/**
 * Subject Name Mapper
 * Maps MITS subject codes to readable subject names
 */

// Common subject name mappings
const SUBJECT_NAME_MAP = {
  // Aptitude and Soft Skills
  'APTITUDE': 'Aptitude',
  'SOFTSKILLS': 'Soft Skills',
  'SOFT SKILLS': 'Soft Skills',
  
  // Core CSE Subjects - Common Patterns
  'CSM101': 'Programming for Problem Solving',
  'CSM102': 'Data Structures',
  'CSM103': 'Database Management Systems',
  'CSM104': 'Operating Systems',
  'CSM105': 'Computer Networks',
  'CSM106': 'Software Engineering',
  'CSM107': 'Compiler Design',
  'CSM108': 'Computer Organization',
  'CSM109': 'Theory of Computation',
  'CSM201': 'Design and Analysis of Algorithms',
  'CSM202': 'Web Technologies',
  'CSM203': 'Machine Learning',
  'CSM204': 'Artificial Intelligence',
  'CSM205': 'Cloud Computing',
  'CSM206': 'Big Data Analytics',
  'CSM207': 'Computer Graphics',
  'CSM208': 'Information Security',
  'CSM209': 'Mobile Application Development',
  'CSM301': 'Data Mining',
  'CSM302': 'Internet of Things',
  'CSM303': 'Blockchain Technology',
  'CSM304': 'Natural Language Processing',
  'CSM401': 'Deep Learning',
  'CSM402': 'Cyber Security',
  'CSM403': 'DevOps',
  'CSM4M02': 'Data Science and Analytics', // Minor/Elective subject
  'CSM501': 'Distributed Systems',
  'CSM502': 'Advanced Database Systems',
  'CSM601': 'Software Testing',
  'CSM602': 'Human Computer Interaction',
  'CSM603': 'Computer Vision',
  'CSM604': 'Parallel Computing',
  
  // Mathematics
  'MAT101': 'Engineering Mathematics - I',
  'MAT102': 'Engineering Mathematics - II',
  'MAT103': 'Engineering Mathematics - III',
  'MAT104': 'Engineering Mathematics - IV',
  'MAT201': 'Discrete Mathematics',
  'MAT202': 'Probability and Statistics',
  'MAT203': 'Linear Algebra',
  
  // Physics and Chemistry
  'PHY101': 'Engineering Physics',
  'PHY102': 'Applied Physics',
  'CHE101': 'Engineering Chemistry',
  
  // English and Communication
  'ENG101': 'Communicative English',
  'ENG201': 'Technical English',
  'ENG301': 'Professional Communication',
  'ENG901': 'English Communication Skills',
  
  // Electronics (for CSE students)
  'ECE101': 'Basic Electronics',
  'ECE201': 'Digital Electronics',
  'ECE301': 'Microprocessors and Microcontrollers',
  'ECE302': 'VLSI Design',
  
  // Management and Economics
  'MGT101': 'Principles of Management',
  'MGT201': 'Entrepreneurship',
  'ECO101': 'Economics for Engineers',
  
  // Environmental Science
  'EVS101': 'Environmental Science',
  'EVS201': 'Environmental Studies',
  
  // Project Work
  'PRJ401': 'Mini Project',
  'PRJ501': 'Major Project - I',
  'PRJ502': 'Major Project - II',
  
  // Internship
  'INT401': 'Industrial Training',
  'INT501': 'Internship'
};

/**
 * Get readable subject name from subject code
 * @param {string} subjectCode - The subject code
 * @returns {string} Readable subject name or the original code
 */
function getSubjectName(subjectCode) {
  if (!subjectCode) return 'Unknown Subject';
  
  const cleanCode = subjectCode.trim().toUpperCase();
  
  // Try exact match first
  if (SUBJECT_NAME_MAP[cleanCode]) {
    return SUBJECT_NAME_MAP[cleanCode];
  }
  
  // Try pattern matching for codes with year prefix (e.g., 23CSM107)
  // Extract the core code part (e.g., CSM107 from 23CSM107)
  const coreCodeMatch = cleanCode.match(/\d{2}([A-Z]{3}\d{3}[A-Z]?\d*)/);
  if (coreCodeMatch && SUBJECT_NAME_MAP[coreCodeMatch[1]]) {
    return SUBJECT_NAME_MAP[coreCodeMatch[1]];
  }
  
  // Try to match just the subject family (e.g., CSM from CSM107)
  const familyMatch = cleanCode.match(/([A-Z]{3})\d/);
  if (familyMatch) {
    const family = familyMatch[1];
    const familyNames = {
      'CSM': 'Computer Science',
      'ECE': 'Electronics',
      'EEE': 'Electrical',
      'MECH': 'Mechanical',
      'CIVIL': 'Civil',
      'MAT': 'Mathematics',
      'PHY': 'Physics',
      'CHE': 'Chemistry',
      'ENG': 'English',
      'MGT': 'Management',
      'ECO': 'Economics'
    };
    
    if (familyNames[family]) {
      return `${familyNames[family]} - ${cleanCode}`;
    }
  }
  
  // Return original code if no mapping found
  return subjectCode;
}

/**
 * Check if a subject code has a specific mapping
 * @param {string} subjectCode - The subject code to check
 * @returns {boolean} True if mapping exists
 */
function hasMapping(subjectCode) {
  if (!subjectCode) return false;
  const cleanCode = subjectCode.trim().toUpperCase();
  return SUBJECT_NAME_MAP[cleanCode] !== undefined;
}

/**
 * Add or update a subject mapping
 * @param {string} subjectCode - The subject code
 * @param {string} subjectName - The readable name
 */
function addMapping(subjectCode, subjectName) {
  if (subjectCode && subjectName) {
    SUBJECT_NAME_MAP[subjectCode.trim().toUpperCase()] = subjectName;
  }
}

module.exports = {
  getSubjectName,
  hasMapping,
  addMapping,
  SUBJECT_NAME_MAP
};
