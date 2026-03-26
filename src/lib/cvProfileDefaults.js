/** Default shape for profile_json.cvProfile (structured CV / 用户资料) */

export function emptyWork() {
  return { company: '', title: '', location: '', startDate: '', endDate: '', highlights: [] }
}

export function emptyEducation() {
  return { institution: '', degree: '', field: '', startDate: '', endDate: '', gpa: '', details: [] }
}

export function emptyProject() {
  return { name: '', role: '', startDate: '', endDate: '', description: [], technologies: '' }
}

export function emptyPublication() {
  return { title: '', venue: '', year: '', authors: '', url: '' }
}

export function emptyLanguage() {
  return { name: '', proficiency: '' }
}

export function emptyAward() {
  return { title: '', year: '', issuer: '' }
}

export function emptyCvProfile() {
  return {
    fullName: '',
    gender: '',
    email: '',
    phone: '',
    location: '',
    linkedIn: '',
    website: '',
    summary: '',
    workExperience: [],
    education: [],
    projects: [],
    publications: [],
    skills: [],
    languages: [],
    awards: [],
  }
}

function normStr(v) {
  return typeof v === 'string' ? v.trim() : v != null ? String(v).trim() : ''
}

function normLines(v) {
  if (Array.isArray(v)) return v.map(normStr).filter(Boolean)
  if (typeof v === 'string') {
    // Split by newlines or typical bullet markers
    return v
      .split(/\n|[•\-\*]/)
      .map(s => s.trim())
      .filter((s) => s && s.length > 1)
  }
  return []
}

function normWork(x) {
  if (!x || typeof x !== 'object') return null
  const o = {
    company: normStr(x.company),
    title: normStr(x.title),
    location: normStr(x.location),
    startDate: normStr(x.startDate),
    endDate: normStr(x.endDate),
    highlights: normLines(x.highlights ?? x.description ?? x.bullet),
  }
  return Object.values(o).some(v => Array.isArray(v) ? v.length > 0 : Boolean(v)) ? o : null
}

function normEdu(x) {
  if (!x || typeof x !== 'object') return null
  const o = {
    institution: normStr(x.institution ?? x.school),
    degree: normStr(x.degree),
    field: normStr(x.field ?? x.major),
    startDate: normStr(x.startDate),
    endDate: normStr(x.endDate),
    gpa: normStr(x.gpa),
    details: normLines(x.details),
  }
  return Object.values(o).some(v => Array.isArray(v) ? v.length > 0 : Boolean(v)) ? o : null
}

function normProj(x) {
  if (!x || typeof x !== 'object') return null
  const o = {
    name: normStr(x.name),
    role: normStr(x.role),
    startDate: normStr(x.startDate),
    endDate: normStr(x.endDate),
    description: normLines(x.description),
    technologies: normStr(x.technologies ?? x.tech),
  }
  return Object.values(o).some(v => Array.isArray(v) ? v.length > 0 : Boolean(v)) ? o : null
}

function normPub(x) {
  if (!x || typeof x !== 'object') return null
  const o = {
    title: normStr(x.title),
    venue: normStr(x.venue),
    year: normStr(x.year),
    authors: normStr(x.authors),
    url: normStr(x.url ?? x.link),
  }
  return Object.values(o).some(Boolean) ? o : null
}

function normLang(x) {
  if (!x || typeof x !== 'object') return null
  const o = { name: normStr(x.name), proficiency: normStr(x.proficiency ?? x.level) }
  return o.name || o.proficiency ? o : null
}

function normAward(x) {
  if (!x || typeof x !== 'object') return null
  const o = { title: normStr(x.title), year: normStr(x.year), issuer: normStr(x.issuer) }
  return Object.values(o).some(Boolean) ? o : null
}

/** Merge API / saved partial object into a full cvProfile */
export function mergeCvProfileFromApi(raw) {
  const base = emptyCvProfile()
  if (!raw || typeof raw !== 'object') return base

  let skills = []
  if (Array.isArray(raw.skills)) {
    skills = raw.skills.map(s => (typeof s === 'string' ? s.trim() : normStr(s.name))).filter(Boolean)
  } else if (typeof raw.skills === 'string') {
    skills = raw.skills.split(/[,，;；]/).map(s => s.trim()).filter(Boolean)
  }

  return {
    ...base,
    fullName: normStr(raw.fullName ?? raw.name),
    gender: normStr(raw.gender || ''),
    email: normStr(raw.email),
    phone: normStr(raw.phone ?? raw.tel),
    location: normStr(raw.location ?? raw.city),
    linkedIn: normStr(raw.linkedIn ?? raw.linkedin),
    website: normStr(raw.website ?? raw.portfolio),
    summary: normStr(raw.summary ?? raw.objective),
    workExperience: Array.isArray(raw.workExperience)
      ? raw.workExperience.map(normWork).filter(Boolean)
      : [],
    education: Array.isArray(raw.education) ? raw.education.map(normEdu).filter(Boolean) : [],
    projects: Array.isArray(raw.projects) ? raw.projects.map(normProj).filter(Boolean) : [],
    publications: Array.isArray(raw.publications) ? raw.publications.map(normPub).filter(Boolean) : [],
    skills,
    languages: Array.isArray(raw.languages) ? raw.languages.map(normLang).filter(Boolean) : [],
    awards: Array.isArray(raw.awards) ? raw.awards.map(normAward).filter(Boolean) : [],
  }
}
