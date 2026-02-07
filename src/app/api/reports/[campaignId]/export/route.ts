import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSurveyById } from '@/lib/sanity';
import { getCurrentUser } from '@/lib/auth/helpers';
import {
  calculateCategoryScores,
  calculateSectionScores,
  calculateSurveyScore,
} from '@/lib/scoring/calculate';
import { checkAnonymityThreshold, ANONYMOUS_SURVEY_TYPES } from '@/lib/scoring/anonymity';
import type { Response } from '@prisma/client';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export async function GET(
  request: NextRequest,
  { params }: { params: { campaignId: string } }
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'xlsx';

    if (format !== 'xlsx' && format !== 'pdf') {
      return NextResponse.json(
        { error: 'Invalid format. Use xlsx or pdf.' },
        { status: 400 }
      );
    }

    // Fetch campaign
    const campaign = await prisma.surveyCampaign.findUnique({
      where: { id: params.campaignId },
      include: {
        organization: true,
        invitations: {
          where: { status: 'COMPLETED' },
          include: {
            user: true,
            responses: true,
          },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Role-based access
    if (
      currentUser.role !== 'SUPER_ADMIN' &&
      campaign.organizationId !== currentUser.organizationId
    ) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Fetch survey from Sanity
    const survey = await getSurveyById(campaign.sanitysurveyId);

    if (!survey) {
      return NextResponse.json(
        { error: 'Survey content not found' },
        { status: 404 }
      );
    }

    // Check anonymity threshold
    const meetsThreshold = await checkAnonymityThreshold(
      campaign.id,
      survey.surveyType
    );

    if (!meetsThreshold) {
      return NextResponse.json(
        {
          error: 'Insufficient respondents',
          message:
            'This survey requires a minimum of 5 completed responses before exporting results.',
        },
        { status: 403 }
      );
    }

    // Collect all responses
    const allResponses: Response[] = [];
    for (const invitation of campaign.invitations) {
      allResponses.push(...invitation.responses);
    }

    // Prepare question definitions
    const questions = survey.sections.flatMap((section) =>
      section.questions.map((q) => ({
        _id: q._id,
        questionNumber: q.number,
        isReversed: q.isReversed,
        category: q.category,
        section: { _id: section._id, title: section.title },
      }))
    );

    const scaleMax = survey.surveyType === 'likert3' ? 3 : 5;

    // Calculate scores
    const surveyScore = calculateSurveyScore(allResponses, questions, scaleMax);
    const categoryScores = calculateCategoryScores(allResponses, questions, scaleMax);
    const sectionScores = calculateSectionScores(allResponses, questions, scaleMax);

    // Generate Excel export
    if (format === 'xlsx') {
      const workbook = XLSX.utils.book_new();

      // Sheet 1: Summary
      const summaryData = [
        ['Survey Report'],
        [''],
        ['Survey Title', campaign.surveyTitle],
        ['Organization', campaign.organization.name],
        ['Survey Type', survey.surveyType],
        ['Start Date', campaign.startDate ? new Date(campaign.startDate).toLocaleDateString() : 'N/A'],
        ['End Date', campaign.endDate ? new Date(campaign.endDate).toLocaleDateString() : 'N/A'],
        ['Status', campaign.status],
        [''],
        ['Response Metrics'],
        ['Total Invitations', campaign.invitations.length],
        ['Completed Responses', campaign.invitations.length],
        ['Completion Rate', `${Math.round((campaign.invitations.length / (campaign.invitations.length || 1)) * 100)}%`],
        [''],
        ['Overall Score'],
        ['Average Score', surveyScore.averageScore.toFixed(1)],
        ['Scale Maximum', scaleMax],
        ['Total Questions', surveyScore.totalQuestions],
        ['Total Responses', surveyScore.totalResponses],
      ];

      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

      // Sheet 2: Category Scores
      const categoryData = [
        ['Category Scores'],
        [''],
        ['Category', 'Average Score', 'Question Count', 'Response Count'],
        ...categoryScores.map((cat) => [
          cat.categoryName,
          cat.averageScore.toFixed(1),
          cat.questionCount,
          cat.responseCount,
        ]),
      ];

      const categorySheet = XLSX.utils.aoa_to_sheet(categoryData);
      XLSX.utils.book_append_sheet(workbook, categorySheet, 'Category Scores');

      // Sheet 3: Section Scores
      const sectionData = [
        ['Section Scores'],
        [''],
        ['Section', 'Average Score', 'Item Count', 'Response Count'],
        ...sectionScores.map((sec) => [
          sec.sectionTitle,
          sec.averageScore.toFixed(1),
          sec.questionCount,
          sec.responseCount,
        ]),
      ];

      const sectionSheet = XLSX.utils.aoa_to_sheet(sectionData);
      XLSX.utils.book_append_sheet(workbook, sectionSheet, 'Section Scores');

      // Sheet 4: Raw Data (ONLY if not Survey 7)
      const isAnonymousSurvey = ANONYMOUS_SURVEY_TYPES.includes(survey.surveyType.toLowerCase());

      if (!isAnonymousSurvey) {
        const rawDataHeaders = [
          'Response ID',
          'Question Number',
          'Question Text',
          'Category',
          'Section',
          'Raw Value',
          'Adjusted Value',
          'Is Reversed',
        ];

        const rawDataRows = allResponses
          .filter((r) => r.value !== null)
          .map((response) => {
            const question = questions.find((q) => q._id === response.sanityQuestionId);
            const questionData = survey.sections
              .flatMap((s) => s.questions)
              .find((q) => q._id === response.sanityQuestionId);

            if (!question || !questionData) {
              return null;
            }

            const rawValue = response.value!;
            const adjustedValue = question.isReversed
              ? scaleMax + 1 - rawValue
              : rawValue;

            return [
              response.id,
              question.questionNumber,
              questionData.text,
              question.category?.name || 'N/A',
              question.section?.title || 'N/A',
              rawValue,
              adjustedValue,
              question.isReversed ? 'Yes' : 'No',
            ];
          })
          .filter((row): row is (string | number)[] => row !== null);

        const rawData = [['Raw Response Data'], [''], rawDataHeaders, ...rawDataRows];

        const rawDataSheet = XLSX.utils.aoa_to_sheet(rawData);
        XLSX.utils.book_append_sheet(workbook, rawDataSheet, 'Raw Data');
      }

      // Generate buffer
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      // Return Excel file
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${campaign.surveyTitle.replace(/[^a-zA-Z0-9]/g, '_')}_Report.xlsx"`,
        },
      });
    }

    // PDF export
    if (format === 'pdf') {
      const doc = new jsPDF();
      const isAnonymousSurvey = ANONYMOUS_SURVEY_TYPES.includes(survey.surveyType.toLowerCase());

      // Cover page
      doc.setFontSize(24);
      doc.text('Survey Report', 105, 30, { align: 'center' });

      doc.setFontSize(16);
      doc.text(campaign.surveyTitle, 105, 45, { align: 'center' });

      doc.setFontSize(12);
      doc.text(campaign.organization.name, 105, 55, { align: 'center' });

      if (campaign.startDate && campaign.endDate) {
        const dateRange = `${new Date(campaign.startDate).toLocaleDateString()} - ${new Date(campaign.endDate).toLocaleDateString()}`;
        doc.text(dateRange, 105, 65, { align: 'center' });
      }

      // Anonymity notice for Survey 7
      if (isAnonymousSurvey) {
        doc.setFontSize(10);
        doc.setTextColor(255, 0, 0);
        doc.text('ANONYMITY PROTECTED', 105, 80, { align: 'center' });
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(9);
        const noticeText = 'Individual responses are protected. Only aggregated scores are included.';
        doc.text(noticeText, 105, 87, { align: 'center' });
      }

      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 105, isAnonymousSurvey ? 100 : 80, {
        align: 'center',
      });

      // Summary section
      doc.addPage();
      doc.setFontSize(16);
      doc.text('Summary', 14, 20);

      autoTable(doc, {
        startY: 30,
        head: [['Metric', 'Value']],
        body: [
          ['Survey Type', survey.surveyType],
          ['Status', campaign.status],
          ['Total Invitations', campaign.invitations.length.toString()],
          ['Completed Responses', campaign.invitations.length.toString()],
          [
            'Completion Rate',
            `${Math.round((campaign.invitations.length / (campaign.invitations.length || 1)) * 100)}%`,
          ],
          ['Overall Score', `${surveyScore.averageScore.toFixed(1)} / ${scaleMax}.0`],
          ['Total Questions', surveyScore.totalQuestions.toString()],
          ['Total Responses', surveyScore.totalResponses.toString()],
        ],
        theme: 'grid',
      });

      // Category Scores
      doc.addPage();
      doc.setFontSize(16);
      doc.text('Category Scores', 14, 20);

      autoTable(doc, {
        startY: 30,
        head: [['Category', 'Average Score', 'Questions', 'Responses']],
        body: categoryScores.map((cat) => [
          cat.categoryName,
          cat.averageScore.toFixed(1),
          cat.questionCount.toString(),
          cat.responseCount.toString(),
        ]),
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
      });

      // Section Scores
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const finalY = (doc as any).lastAutoTable.finalY || 30;
      doc.setFontSize(16);
      doc.text('Section Scores', 14, finalY + 20);

      autoTable(doc, {
        startY: finalY + 30,
        head: [['Section', 'Average Score', 'Items', 'Responses']],
        body: sectionScores.map((sec) => [
          sec.sectionTitle,
          sec.averageScore.toFixed(1),
          sec.questionCount.toString(),
          sec.responseCount.toString(),
        ]),
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
      });

      // Generate PDF buffer
      const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

      // Return PDF file
      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${campaign.surveyTitle.replace(/[^a-zA-Z0-9]/g, '_')}_Report.pdf"`,
        },
      });
    }

    return NextResponse.json(
      { error: 'Invalid format' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error generating export:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
