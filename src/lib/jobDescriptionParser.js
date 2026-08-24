const CATEGORY_RULES = {
  ai_research: [
    [/machine learning|deep learning|artificial intelligence|computer vision|natural language processing|generative ai|\bllm\b|神经网络|机器学习|人工智能|计算机视觉|大模型|künstliche intelligenz|maschinelles lernen/gi, 4],
    [/pytorch|tensorflow|hugging face|langchain|prompt engineering|mlops/gi, 2],
  ],
  software_data: [
    [/frontend|backend|full.?stack|software (?:engineer|developer)|web developer|mobile developer|软件开发|前端|后端|全栈|informatiker|softwareentwick/gi, 4],
    [/javascript|typescript|react|vue|angular|node\.js|java\b|python\b|\.net|cloud|devops|kubernetes|database|sql|data analyst|数据分析|云计算/gi, 1],
  ],
  product_design: [
    [/product manager|product owner|product management|产品经理|产品管理|produktmanager|produktmanagement/gi, 4],
    [/\bux\b|\bui\b|user experience|user research|interaction design|graphic design|用户体验|用户研究|交互设计|视觉设计/gi, 3],
  ],
  marketing_sales: [
    [/marketing|performance marketing|brand management|social media|content marketing|市场营销|品牌|市场推广|营销|vertrieb|marketing/gi, 3],
    [/\bsales\b|account executive|business development|customer success|crm|销售|客户成功|geschäftsentwicklung/gi, 3],
  ],
  finance_hr: [
    [/finance|financial|accounting|audit|controlling|tax|treasury|investment|财务|金融|会计|审计|税务|finanzen|buchhaltung|prüfung/gi, 3],
    [/human resources|people operations|talent acquisition|recruiting|recruiter|人力资源|招聘|personalwesen/gi, 3],
  ],
  engineering_industry: [
    [/mechanical|electrical|automotive|mechatronic|civil engineer|industrial engineer|机械|电气|汽车|机电|土木|maschinenbau|elektrotechnik|fahrzeugtechnik/gi, 4],
    [/manufactur|production|quality engineer|supply chain|logistics|semiconductor|制造|生产|供应链|物流|halbleiter|produktion/gi, 2],
  ],
  consulting_ops: [
    [/consulting|consultant|strategy|operations|project management|pmo|procurement|咨询|战略|运营|项目管理|采购|beratung|unternehmensberatung/gi, 3],
    [/process improvement|stakeholder management|business analyst|业务分析|流程优化/gi, 2],
  ],
}

const EMPLOYMENT_RULES = [
  ['working_student', /werkstudent(?:in)?|working student|studentische hilfskraft|student assistant|学生工|勤工助学/i],
  ['internship', /praktik(?:um|ant|antin)|\bintern(?:ship)?\b|实习(?:生)?/i],
  ['part_time', /teilzeit|part[- ]?time|兼职/i],
  ['contract', /freelance|freiberuf|contractor|fixed[- ]term|befristet|合同制|劳务合同/i],
  ['full_time', /vollzeit|full[- ]?time|permanent position|festanstellung|全职|正式员工/i],
]

const TITLE_LABEL_PATTERN = /(?:job\s*title|position\s*title|position|role|jobtitel|stellenbezeichnung|职位名称|应聘职位|招聘职位|岗位名称|岗位)\s*[:：]\s*([^\n|]{2,120})/i
const GENERIC_HEADINGS = /^(job description|stellenbeschreibung|about us|about the job|your role|the role|responsibilities|requirements|qualifications|what you.?ll do|who we are|公司介绍|职位描述|岗位职责|任职要求|工作内容|关于我们)$/i
const ROLE_TERMS = /developer|engineer|manager|analyst|consultant|designer|scientist|specialist|coordinator|assistant|intern|werkstudent|praktik|entwickler|ingenieur|berater|manager|spezialist|设计师|工程师|经理|分析师|顾问|专员|实习|学生工/i

function cleanTitle(value) {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^[\s#*•·–—-]+|[\s#*•·–—-]+$/g, '')
    .replace(/^(?:an?|the|eine[nrms]?|einen?)\s+/i, '')
    .split(/\s+(?:to join|who will|for our|within our|für unser|bei uns)\b/i)[0]
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)
}

function extractPosition(text) {
  const labeled = text.match(TITLE_LABEL_PATTERN)?.[1]
  if (labeled) return cleanTitle(labeled)

  const lines = text
    .replace(/<[^>]+>/g, '\n')
    .split(/\r?\n/)
    .map(cleanTitle)
    .filter(line => line.length >= 3 && line.length <= 120 && !GENERIC_HEADINGS.test(line) && !/^https?:|^www\./i.test(line))
    .slice(0, 25)

  const scored = lines.map((line, index) => {
    let score = Math.max(0, 4 - index * 0.2)
    if (ROLE_TERMS.test(line)) score += 6
    if (/\((?:m|w|d|f|x)(?:[\s/|,-]+(?:m|w|d|f|x)){1,}\)/i.test(line)) score += 3
    if (/werkstudent|working student|intern|praktik|full.?time|vollzeit|实习|全职|学生工/i.test(line)) score += 2
    if (/[:：]$/.test(line) || line.split(/\s+/).length > 14) score -= 4
    return { line, score }
  }).sort((a, b) => b.score - a.score)
  if (scored[0]?.score >= 5) return scored[0].line

  const sentencePatterns = [
    /we (?:are )?looking for\s+([^\n.!]{3,120})/i,
    /we are hiring\s+([^\n.!]{3,120})/i,
    /wir suchen\s+([^\n.!]{3,120})/i,
    /(?:招聘|诚聘|寻找)(?:一名|一个|：|:)?\s*([^\n，。；]{2,60})/i,
  ]
  for (const pattern of sentencePatterns) {
    const matched = text.match(pattern)?.[1]
    if (matched) return cleanTitle(matched)
  }
  return lines[0] || ''
}

function detectCategory(text) {
  const scores = Object.entries(CATEGORY_RULES).map(([category, rules]) => {
    let score = 0
    rules.forEach(([pattern, weight]) => {
      pattern.lastIndex = 0
      const matches = text.match(pattern)
      score += Math.min(matches?.length || 0, 5) * weight
    })
    return { category, score }
  }).sort((a, b) => b.score - a.score)
  return scores[0]?.score > 0 ? scores[0].category : 'consulting_ops'
}

export function parseJobDescription(jobDescription) {
  const text = String(jobDescription || '').replace(/\u00a0/g, ' ').trim()
  if (text.length < 50) throw new Error('JOB_DESCRIPTION_TOO_SHORT')
  const employmentType = EMPLOYMENT_RULES.find(([, pattern]) => pattern.test(text))?.[0] || 'full_time'
  return {
    position: extractPosition(text),
    category: detectCategory(text),
    employmentType,
  }
}
