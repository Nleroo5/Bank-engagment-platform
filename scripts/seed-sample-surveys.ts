/**
 * Seed Script: Create Sample Surveys with Questions
 *
 * Populates all 5 surveys with realistic questions:
 * 1. Demographics (13 questions)
 * 2. Leadership Team Effectiveness - LTE (40 questions)
 * 3. Operational Team Effectiveness - OTE (36 questions)
 * 4. Managerial Assessment (35 questions with reverse-scoring)
 * 5. Associate 180° Assessment (35 questions with reverse-scoring)
 *
 * Usage:
 *   npm run db:seed-surveys
 */

import { prisma } from '../src/lib/prisma';

async function seedSurveys() {
  console.log('🌱 Starting survey seed process...\n');

  try {
    // Fetch categories and scales
    const categories = await prisma.category.findMany();
    const scale3Point = await prisma.scale.findFirst({
      where: { scaleType: 'likert3' },
    });
    const scale5Point = await prisma.scale.findFirst({
      where: { scaleType: 'likert5' },
    });

    const categoryMap = new Map(categories.map((c) => [c.name, c.id]));

    // ==============================================
    // SURVEY 1: DEMOGRAPHICS
    // ==============================================
    console.log('📋 Creating Demographics Survey...');

    let demoSurvey = await prisma.survey.findFirst({
      where: { title: 'Employee Demographics' },
    });

    if (!demoSurvey) {
      demoSurvey = await prisma.survey.create({
        data: {
          title: 'Employee Demographics',
          description: 'Collect employee demographic and organizational information',
          surveyType: 'demographics',
          surveyNumber: '1',
          status: 'ACTIVE',
          surveyjsSchema: {},
        },
      });
    }

    const demoQuestions = [
      {
        number: 1,
        text: 'Name of Bank',
        type: 'text',
        category: 'Demographics',
        config: {
          fieldType: 'bankName',
          demographicKey: 'bankName',
          inputType: 'text',
          options: [],
          allowOther: false,
          placeholder: 'Enter your bank name',
          autoAdvance: false,
        },
      },
      {
        number: 2,
        text: 'Country',
        type: 'dropdown',
        category: 'Demographics',
        config: {
          fieldType: 'country',
          demographicKey: 'country',
          inputType: 'dropdown',
          options: [
            'United States',
            'Canada',
            'United Kingdom',
            'Australia',
            'Germany',
            'France',
            'Japan',
            'Singapore',
            'Hong Kong',
            'India',
            'Brazil',
            'Mexico',
            'South Africa',
            'United Arab Emirates',
            'Switzerland',
          ],
          allowOther: true,
          placeholder: 'Select your country',
          autoAdvance: false,
        },
      },
      {
        number: 3,
        text: 'State/Province',
        type: 'dropdown',
        category: 'Demographics',
        config: {
          fieldType: 'state',
          demographicKey: 'state',
          inputType: 'dropdown',
          options: [
            'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California',
            'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia',
            'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
            'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland',
            'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri',
            'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey',
            'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
            'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina',
            'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
            'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming',
            'District of Columbia',
          ],
          allowOther: true,
          placeholder: 'Select your state or province',
          autoAdvance: false,
        },
      },
      {
        number: 4,
        text: 'Metro City Area',
        type: 'text',
        category: 'Demographics',
        config: {
          fieldType: 'metroArea',
          demographicKey: 'metroArea',
          inputType: 'text',
          options: [],
          allowOther: false,
          placeholder: 'Enter your metro area',
          autoAdvance: false,
        },
      },
      {
        number: 5,
        text: 'City',
        type: 'text',
        category: 'Demographics',
        config: {
          fieldType: 'city',
          demographicKey: 'city',
          inputType: 'text',
          options: [],
          allowOther: false,
          placeholder: 'Enter your city',
          autoAdvance: false,
        },
      },
      {
        number: 6,
        text: 'Size of Bank (Total Assets)',
        type: 'dropdown',
        category: 'Demographics',
        config: {
          fieldType: 'bankSize',
          demographicKey: 'bankSize',
          inputType: 'dropdown',
          options: [
            '<$100M',
            '$100 - $249M',
            '$250 - $499M',
            '$500 - $749M',
            '$750 - $999M',
            '$1 - $2.99B',
            '$3 - $4.99B',
            '$5 - $7.49B',
            '$7.5 - $9.99B',
            '$10 - $19.99B',
            '>$20B',
          ],
          allowOther: false,
          placeholder: 'Select bank size',
          autoAdvance: false,
        },
      },
      {
        number: 7,
        text: 'Device Used',
        type: 'radio',
        category: 'Demographics',
        config: {
          fieldType: 'device',
          demographicKey: 'device',
          inputType: 'radio',
          options: ['Desktop / Laptop', 'Tablet', 'Mobile Phone'],
          allowOther: false,
          placeholder: '',
          autoAdvance: true,
        },
      },
      {
        number: 8,
        text: 'Employment Status',
        type: 'radio',
        category: 'Demographics',
        config: {
          fieldType: 'employmentStatus',
          demographicKey: 'employmentStatus',
          inputType: 'radio',
          options: ['Full-time', 'Part-time', 'Peak-time'],
          allowOther: false,
          placeholder: '',
          autoAdvance: true,
        },
      },
      {
        number: 9,
        text: 'Gender',
        type: 'radio',
        category: 'Demographics',
        config: {
          fieldType: 'gender',
          demographicKey: 'gender',
          inputType: 'radio',
          options: ['Female', 'Male', 'Other'],
          allowOther: false,
          placeholder: '',
          autoAdvance: true,
        },
      },
      {
        number: 10,
        text: 'Time at the Bank',
        type: 'radio',
        category: 'Demographics',
        config: {
          fieldType: 'timeAtBank',
          demographicKey: 'timeAtBank',
          inputType: 'radio',
          options: [
            '0-5 years',
            '6-10 years',
            '11-20 years',
            '>20 years',
          ],
          allowOther: false,
          placeholder: '',
          autoAdvance: true,
        },
      },
      {
        number: 11,
        text: 'Bank Experience',
        type: 'radio',
        category: 'Demographics',
        config: {
          fieldType: 'bankExperience',
          demographicKey: 'bankExperience',
          inputType: 'radio',
          options: [
            '0-5 years',
            '6-10 years',
            '11-20 years',
            '>20 years',
          ],
          allowOther: false,
          placeholder: '',
          autoAdvance: true,
        },
      },
      {
        number: 12,
        text: 'Bank Division',
        type: 'dropdown',
        category: 'Demographics',
        config: {
          fieldType: 'division',
          demographicKey: 'division',
          inputType: 'dropdown',
          options: [
            'Administration',
            'Call Center',
            'Commercial Banking',
            'Credit Department',
            'Information Systems / Technology',
            'Loan Administration',
            'Operations',
            'Retail Banking',
            'Risk',
            'Wealth Management',
            'Other',
          ],
          allowOther: true,
          placeholder: 'Select your division',
          autoAdvance: false,
        },
      },
      {
        number: 13,
        text: 'Job Role/Title',
        type: 'dropdown',
        category: 'Demographics',
        config: {
          fieldType: 'jobRole',
          demographicKey: 'jobRole',
          inputType: 'dropdown',
          options: [
            'Branch Staff',
            'Branch Manager',
            'Call Center Operations',
            'C-Suite Executive',
            'Credit Underwriting',
            'Executive Management',
            'Finance',
            'Financial Advisors',
            'Human Resources',
            'Loan Administration',
            'Operations Staff',
            'Relationship Manager',
            'Risk',
            'Support Staff',
            'Technology Staff',
            'Other',
          ],
          allowOther: true,
          placeholder: 'Select your role',
          autoAdvance: false,
        },
      },
    ];

    for (const q of demoQuestions) {
      const existing = await prisma.question.findFirst({
        where: {
          surveyId: demoSurvey.id,
          questionNumber: q.number,
        },
      });

      if (!existing) {
        await prisma.question.create({
          data: {
            surveyId: demoSurvey.id,
            questionNumber: q.number,
            text: q.text,
            questionType: q.type,
            surveyjsName: `q${q.number}`,
            isRequired: true,
            isReversed: false,
            sortOrder: q.number,
            config: q.config,
            categories: {
              create: {
                categoryId: categoryMap.get(q.category)!,
              },
            },
          },
        });
      } else {
        // Always update config on existing demographics questions
        await prisma.question.update({
          where: { id: existing.id },
          data: {
            config: q.config,
            text: q.text,
            questionType: q.type,
          },
        });
      }
    }

    console.log(`   ✓ Demographics: ${demoQuestions.length} questions\n`);

    // ==============================================
    // SURVEY 2: LEADERSHIP TEAM EFFECTIVENESS (LTE)
    // ==============================================
    console.log('📋 Creating Leadership Team Effectiveness Survey...');

    let lteSurvey = await prisma.survey.findFirst({
      where: { title: 'Leadership Team Effectiveness (LTE)' },
    });

    if (!lteSurvey) {
      lteSurvey = await prisma.survey.create({
        data: {
          title: 'Leadership Team Effectiveness (LTE)',
          description: 'Assess leadership team performance and dynamics',
          surveyType: 'likert5',
          surveyNumber: '4',
          status: 'ACTIVE',
          scaleId: scale5Point?.id,
          surveyjsSchema: {},
        },
      });
    }

    const lteQuestions = [
      // Goal Setting (Questions 1-10)
      { number: 1, text: 'The team has clearly defined goals', category: 'Leadership' },
      { number: 2, text: 'Team goals are aligned with organizational objectives', category: 'Accountability' },
      { number: 3, text: 'Progress toward goals is regularly monitored', category: 'Execution' },
      { number: 4, text: 'Team members understand how their work contributes to goals', category: 'Associate' },
      { number: 5, text: 'Goals are achievable yet challenging', category: 'Team Dynamics' },
      { number: 6, text: 'The team communicates goals effectively to stakeholders', category: 'Communication' },
      { number: 7, text: 'Leadership provides clear direction', category: 'Leadership' },
      { number: 8, text: 'The team creates a positive work environment', category: 'Culture' },
      { number: 9, text: 'Team members are held accountable for results', category: 'Accountability' },
      { number: 10, text: 'Resources are allocated effectively to achieve goals', category: 'Execution' },

      // Roles & Responsibilities (Questions 11-20)
      { number: 11, text: 'Team roles and responsibilities are clearly defined', category: 'Associate' },
      { number: 12, text: 'Team members understand their individual roles', category: 'Team Dynamics' },
      { number: 13, text: 'Role expectations are communicated clearly', category: 'Communication' },
      { number: 14, text: 'Leadership ensures role clarity across the team', category: 'Leadership' },
      { number: 15, text: 'The team values diverse perspectives and skills', category: 'Culture' },
      { number: 16, text: 'Responsibilities are distributed fairly', category: 'Accountability' },
      { number: 17, text: 'Team members execute their responsibilities effectively', category: 'Execution' },
      { number: 18, text: 'Cross-functional collaboration is encouraged', category: 'Associate' },
      { number: 19, text: 'Team members support each other in their roles', category: 'Team Dynamics' },
      { number: 20, text: 'Information flows smoothly between roles', category: 'Communication' },

      // Interpersonal Relationships (Questions 21-30)
      { number: 21, text: 'Team members trust each other', category: 'Leadership' },
      { number: 22, text: 'Conflicts are addressed constructively', category: 'Accountability' },
      { number: 23, text: 'The team works well together under pressure', category: 'Execution' },
      { number: 24, text: 'Individual contributions are recognized and valued', category: 'Associate' },
      { number: 25, text: 'Team members feel comfortable sharing ideas', category: 'Team Dynamics' },
      { number: 26, text: 'Open and honest communication is the norm', category: 'Communication' },
      { number: 27, text: 'Leadership fosters positive relationships', category: 'Leadership' },
      { number: 28, text: 'The team culture promotes mutual respect', category: 'Culture' },
      { number: 29, text: 'Team members follow through on commitments', category: 'Accountability' },
      { number: 30, text: 'Decisions are made collaboratively when appropriate', category: 'Execution' },

      // Procedures & Processes (Questions 31-40)
      { number: 31, text: 'Work processes are well-documented and followed', category: 'Associate' },
      { number: 32, text: 'The team has effective meeting practices', category: 'Team Dynamics' },
      { number: 33, text: 'Leadership sets clear priorities', category: 'Leadership' },
      { number: 34, text: 'Performance metrics are tracked and reviewed', category: 'Accountability' },
      { number: 35, text: 'Processes are continuously improved', category: 'Execution' },
      { number: 36, text: 'Communication channels are effective', category: 'Communication' },
      { number: 37, text: 'The team adapts well to change', category: 'Culture' },
      { number: 38, text: 'Decision-making processes are transparent', category: 'Accountability' },
      { number: 39, text: 'Team meetings are productive and efficient', category: 'Team Dynamics' },
      { number: 40, text: 'Information is shared in a timely manner', category: 'Communication' },
    ];

    for (const q of lteQuestions) {
      const existing = await prisma.question.findFirst({
        where: {
          surveyId: lteSurvey.id,
          questionNumber: q.number,
        },
      });

      if (!existing) {
        await prisma.question.create({
          data: {
            surveyId: lteSurvey.id,
            questionNumber: q.number,
            text: q.text,
            questionType: 'likert',
            surveyjsName: `q${q.number}`,
            isRequired: true,
            isReversed: false,
            sortOrder: q.number,
            categories: {
              create: {
                categoryId: categoryMap.get(q.category)!,
              },
            },
          },
        });
      }
    }

    console.log(`   ✓ LTE: ${lteQuestions.length} questions\n`);

    // ==============================================
    // SURVEY 3: OPERATIONAL TEAM EFFECTIVENESS (OTE)
    // ==============================================
    console.log('📋 Creating Operational Team Effectiveness Survey...');

    let oteSurvey = await prisma.survey.findFirst({
      where: { title: 'Operational Team Effectiveness (OTE)' },
    });

    if (!oteSurvey) {
      oteSurvey = await prisma.survey.create({
        data: {
          title: 'Operational Team Effectiveness (OTE)',
          description: 'Evaluate operational team performance and support systems',
          surveyType: 'likert5',
          surveyNumber: '5',
          status: 'ACTIVE',
          scaleId: scale5Point?.id,
          surveyjsSchema: {},
        },
      });
    }

    const oteQuestions = [
      // Operating Effectiveness (Questions 1-15)
      { number: 1, text: 'Our team delivers quality work consistently', category: 'Execution' },
      { number: 2, text: 'Team members have the skills needed for their roles', category: 'Associate' },
      { number: 3, text: 'We meet deadlines and commitments', category: 'Accountability' },
      { number: 4, text: 'Communication between team members is effective', category: 'Communication' },
      { number: 5, text: 'The team collaborates well to solve problems', category: 'Team Dynamics' },
      { number: 6, text: 'Leadership provides clear expectations', category: 'Leadership' },
      { number: 7, text: 'Our work environment supports productivity', category: 'Culture' },
      { number: 8, text: 'Resources are available when needed', category: 'Execution' },
      { number: 9, text: 'Individual performance is regularly reviewed', category: 'Associate' },
      { number: 10, text: 'Team members take ownership of their work', category: 'Accountability' },
      { number: 11, text: 'Information is shared openly across the team', category: 'Communication' },
      { number: 12, text: 'The team handles workload fluctuations well', category: 'Team Dynamics' },
      { number: 13, text: 'Leadership removes obstacles to success', category: 'Leadership' },
      { number: 14, text: 'Innovation and improvement are encouraged', category: 'Culture' },
      { number: 15, text: 'Quality standards are consistently met', category: 'Execution' },

      // Support Person Effectiveness (Questions 16-25)
      { number: 16, text: 'Support staff are responsive to requests', category: 'Associate' },
      { number: 17, text: 'Support systems are reliable and efficient', category: 'Accountability' },
      { number: 18, text: 'Support staff communicate clearly', category: 'Communication' },
      { number: 19, text: 'Support teams work well with operational teams', category: 'Team Dynamics' },
      { number: 20, text: 'Support leadership is accessible', category: 'Leadership' },
      { number: 21, text: 'Support culture aligns with organizational values', category: 'Culture' },
      { number: 22, text: 'Support services meet operational needs', category: 'Execution' },
      { number: 23, text: 'Support staff have adequate training', category: 'Associate' },
      { number: 24, text: 'Support processes are well-designed', category: 'Accountability' },
      { number: 25, text: 'Feedback to support teams is acted upon', category: 'Communication' },

      // Leadership Team Support (Questions 26-36)
      { number: 26, text: 'Leadership supports operational priorities', category: 'Leadership' },
      { number: 27, text: 'Strategic direction is clearly communicated', category: 'Communication' },
      { number: 28, text: 'Leadership creates a positive culture', category: 'Culture' },
      { number: 29, text: 'Leadership holds themselves accountable', category: 'Accountability' },
      { number: 30, text: 'Strategic decisions are executed effectively', category: 'Execution' },
      { number: 31, text: 'Leadership invests in employee development', category: 'Associate' },
      { number: 32, text: 'Leadership fosters cross-team collaboration', category: 'Team Dynamics' },
      { number: 33, text: 'Leadership is visible and accessible', category: 'Leadership' },
      { number: 34, text: 'Leadership responds to operational feedback', category: 'Communication' },
      { number: 35, text: 'Leadership aligns resources with priorities', category: 'Execution' },
      { number: 36, text: 'Leadership builds trust across the organization', category: 'Culture' },
    ];

    for (const q of oteQuestions) {
      const existing = await prisma.question.findFirst({
        where: {
          surveyId: oteSurvey.id,
          questionNumber: q.number,
        },
      });

      if (!existing) {
        await prisma.question.create({
          data: {
            surveyId: oteSurvey.id,
            questionNumber: q.number,
            text: q.text,
            questionType: 'likert',
            surveyjsName: `q${q.number}`,
            isRequired: true,
            isReversed: false,
            sortOrder: q.number,
            categories: {
              create: {
                categoryId: categoryMap.get(q.category)!,
              },
            },
          },
        });
      }
    }

    console.log(`   ✓ OTE: ${oteQuestions.length} questions\n`);

    // ==============================================
    // SURVEY 4: MANAGERIAL ASSESSMENT
    // ==============================================
    console.log('📋 Creating Managerial Assessment Survey...');

    let managerialSurvey = await prisma.survey.findFirst({
      where: { title: 'Managerial Assessment' },
    });

    if (!managerialSurvey) {
      managerialSurvey = await prisma.survey.create({
        data: {
          title: 'Managerial Assessment',
          description: 'Assess managerial effectiveness and leadership behaviors',
          surveyType: 'likert3',
          surveyNumber: '6',
          status: 'ACTIVE',
          scaleId: scale3Point?.id,
          surveyjsSchema: {},
        },
      });
    }

    const managerialQuestions = [
      // Questions with reverse-scoring marked
      { number: 1, text: 'Provides clear direction and expectations', category: 'Leadership', reversed: false },
      { number: 2, text: 'Holds team members accountable for results', category: 'Accountability', reversed: false },
      { number: 3, text: 'Ensures work is completed on time and to standard', category: 'Execution', reversed: false },
      { number: 4, text: 'Supports individual development and growth', category: 'Associate', reversed: false },
      { number: 5, text: 'Promotes positive team dynamics', category: 'Team Dynamics', reversed: false },
      { number: 6, text: 'Communicates effectively with the team', category: 'Communication', reversed: false },
      { number: 7, text: 'Demonstrates strong leadership skills', category: 'Leadership', reversed: false },
      { number: 8, text: 'Creates a culture of trust and respect', category: 'Culture', reversed: false },
      { number: 9, text: 'Takes responsibility for team outcomes', category: 'Accountability', reversed: false },
      { number: 10, text: 'Focuses on achieving key objectives', category: 'Execution', reversed: false },
      { number: 11, text: 'Recognizes and rewards good performance', category: 'Associate', reversed: false },
      { number: 12, text: 'Resolves conflicts constructively', category: 'Team Dynamics', reversed: false },
      { number: 13, text: 'Listens to team member concerns', category: 'Communication', reversed: false },
      { number: 14, text: 'Makes timely and effective decisions', category: 'Leadership', reversed: false },
      { number: 15, text: 'Promotes organizational values', category: 'Culture', reversed: false },
      { number: 16, text: 'Micromanages team members', category: 'Accountability', reversed: true }, // REVERSED
      { number: 17, text: 'Prioritizes tasks effectively', category: 'Execution', reversed: false },
      { number: 18, text: 'Provides constructive feedback', category: 'Associate', reversed: false },
      { number: 19, text: 'Builds strong team cohesion', category: 'Team Dynamics', reversed: false },
      { number: 20, text: 'Shares information openly', category: 'Communication', reversed: false },
      { number: 21, text: 'Inspires confidence in the team', category: 'Leadership', reversed: false },
      { number: 22, text: 'Avoids addressing performance issues', category: 'Accountability', reversed: true }, // REVERSED
      { number: 23, text: 'Removes obstacles to team success', category: 'Execution', reversed: false },
      { number: 24, text: 'Invests time in coaching team members', category: 'Associate', reversed: false },
      { number: 25, text: 'Encourages collaboration and teamwork', category: 'Team Dynamics', reversed: false },
      { number: 26, text: 'Keeps team informed of important changes', category: 'Communication', reversed: false },
      { number: 27, text: 'Leads by example', category: 'Leadership', reversed: false },
      { number: 28, text: 'Shows favoritism toward certain team members', category: 'Culture', reversed: true }, // REVERSED
      { number: 29, text: 'Follows through on commitments', category: 'Accountability', reversed: false },
      { number: 30, text: 'Maintains focus on strategic priorities', category: 'Execution', reversed: false },
      { number: 31, text: 'Supports work-life balance', category: 'Associate', reversed: false },
      { number: 32, text: 'Creates an inclusive team environment', category: 'Team Dynamics', reversed: false },
      { number: 33, text: 'Makes themselves available when needed', category: 'Leadership', reversed: false },
      { number: 34, text: 'Blames others for problems', category: 'Accountability', reversed: true }, // REVERSED
      { number: 35, text: 'Adapts leadership style to situations', category: 'Leadership', reversed: false },
    ];

    for (const q of managerialQuestions) {
      const existing = await prisma.question.findFirst({
        where: {
          surveyId: managerialSurvey.id,
          questionNumber: q.number,
        },
      });

      if (!existing) {
        await prisma.question.create({
          data: {
            surveyId: managerialSurvey.id,
            questionNumber: q.number,
            text: q.text,
            questionType: 'likert',
            surveyjsName: `q${q.number}`,
            isRequired: true,
            isReversed: q.reversed,
            sortOrder: q.number,
            categories: {
              create: {
                categoryId: categoryMap.get(q.category)!,
              },
            },
          },
        });
      }
    }

    console.log(`   ✓ Managerial Assessment: ${managerialQuestions.length} questions (${managerialQuestions.filter(q => q.reversed).length} reversed)\n`);

    // ==============================================
    // SURVEY 5: ASSOCIATE 180° ASSESSMENT
    // ==============================================
    console.log('📋 Creating Associate 180° Assessment Survey...');

    let associate180Survey = await prisma.survey.findFirst({
      where: { title: 'Associate 180° Assessment' },
    });

    if (!associate180Survey) {
      associate180Survey = await prisma.survey.create({
        data: {
          title: 'Associate 180° Assessment',
          description: 'Anonymous peer assessment of associate performance (requires 5+ respondents)',
          surveyType: 'associate180',
          surveyNumber: '7',
          status: 'ACTIVE',
          scaleId: scale3Point?.id,
          surveyjsSchema: {},
        },
      });
    }

    const associate180Questions = [
      // Similar structure to Managerial Assessment but focused on peer behaviors
      { number: 1, text: 'Demonstrates professionalism in all interactions', category: 'Leadership', reversed: false },
      { number: 2, text: 'Takes ownership of assigned tasks', category: 'Accountability', reversed: false },
      { number: 3, text: 'Completes work accurately and on time', category: 'Execution', reversed: false },
      { number: 4, text: 'Seeks opportunities to learn and improve', category: 'Associate', reversed: false },
      { number: 5, text: 'Contributes positively to team dynamics', category: 'Team Dynamics', reversed: false },
      { number: 6, text: 'Communicates clearly and effectively', category: 'Communication', reversed: false },
      { number: 7, text: 'Shows initiative in solving problems', category: 'Leadership', reversed: false },
      { number: 8, text: 'Treats colleagues with respect', category: 'Culture', reversed: false },
      { number: 9, text: 'Admits mistakes and learns from them', category: 'Accountability', reversed: false },
      { number: 10, text: 'Focuses on priorities and deadlines', category: 'Execution', reversed: false },
      { number: 11, text: 'Accepts feedback constructively', category: 'Associate', reversed: false },
      { number: 12, text: 'Helps team members when needed', category: 'Team Dynamics', reversed: false },
      { number: 13, text: 'Keeps others informed of progress', category: 'Communication', reversed: false },
      { number: 14, text: 'Takes on challenging assignments', category: 'Leadership', reversed: false },
      { number: 15, text: 'Promotes a positive work environment', category: 'Culture', reversed: false },
      { number: 16, text: 'Makes excuses for poor performance', category: 'Accountability', reversed: true }, // REVERSED
      { number: 17, text: 'Manages time and priorities effectively', category: 'Execution', reversed: false },
      { number: 18, text: 'Demonstrates strong technical skills', category: 'Associate', reversed: false },
      { number: 19, text: 'Collaborates well with diverse personalities', category: 'Team Dynamics', reversed: false },
      { number: 20, text: 'Listens actively to others', category: 'Communication', reversed: false },
      { number: 21, text: 'Volunteers for team initiatives', category: 'Leadership', reversed: false },
      { number: 22, text: 'Gossips or speaks negatively about others', category: 'Culture', reversed: true }, // REVERSED
      { number: 23, text: 'Delivers high-quality work', category: 'Execution', reversed: false },
      { number: 24, text: 'Adapts to changing priorities', category: 'Associate', reversed: false },
      { number: 25, text: 'Supports team goals over personal agenda', category: 'Team Dynamics', reversed: false },
      { number: 26, text: 'Provides helpful input in discussions', category: 'Communication', reversed: false },
      { number: 27, text: 'Influences others in positive ways', category: 'Leadership', reversed: false },
      { number: 28, text: 'Contributes to organizational culture', category: 'Culture', reversed: false },
      { number: 29, text: 'Blames others when things go wrong', category: 'Accountability', reversed: true }, // REVERSED
      { number: 30, text: 'Meets commitments consistently', category: 'Execution', reversed: false },
      { number: 31, text: 'Shares knowledge with colleagues', category: 'Associate', reversed: false },
      { number: 32, text: 'Resolves disagreements professionally', category: 'Team Dynamics', reversed: false },
      { number: 33, text: 'Demonstrates reliability and dependability', category: 'Leadership', reversed: false },
      { number: 34, text: 'Resists change and new ideas', category: 'Accountability', reversed: true }, // REVERSED
      { number: 35, text: 'Shows flexibility in approach', category: 'Culture', reversed: false },
    ];

    for (const q of associate180Questions) {
      const existing = await prisma.question.findFirst({
        where: {
          surveyId: associate180Survey.id,
          questionNumber: q.number,
        },
      });

      if (!existing) {
        await prisma.question.create({
          data: {
            surveyId: associate180Survey.id,
            questionNumber: q.number,
            text: q.text,
            questionType: 'likert',
            surveyjsName: `q${q.number}`,
            isRequired: true,
            isReversed: q.reversed,
            sortOrder: q.number,
            categories: {
              create: {
                categoryId: categoryMap.get(q.category)!,
              },
            },
          },
        });
      }
    }

    console.log(`   ✓ Associate 180°: ${associate180Questions.length} questions (${associate180Questions.filter(q => q.reversed).length} reversed)\n`);

    // ==============================================
    // SUMMARY
    // ==============================================
    console.log('\n✅ Survey seed completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - Demographics: 13 questions`);
    console.log(`   - Leadership Team Effectiveness: 40 questions`);
    console.log(`   - Operational Team Effectiveness: 36 questions`);
    console.log(`   - Managerial Assessment: 35 questions (4 reversed)`);
    console.log(`   - Associate 180°: 35 questions (4 reversed)`);
    console.log(`   - Total: 158 questions across 5 surveys`);
    console.log('\n🎯 All surveys are ready for use!');
    console.log('   View them at: https://www.drivemoreleads.co/admin/surveys\n');

  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed
seedSurveys()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
