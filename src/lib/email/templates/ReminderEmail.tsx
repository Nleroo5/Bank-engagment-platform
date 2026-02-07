import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface ReminderEmailProps {
  surveyTitle: string;
  surveyLink: string;
  organizationName: string;
  daysRemaining: number;
  deadline?: string;
}

export function ReminderEmail({
  surveyTitle,
  surveyLink,
  organizationName,
  daysRemaining,
  deadline,
}: ReminderEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        {`Reminder: ${surveyTitle} - ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} remaining`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Survey Reminder</Heading>

          <Text style={text}>
            This is a friendly reminder that you have not yet completed the
            following survey:
          </Text>

          <Section style={highlightBox}>
            <Text style={highlightText}>{surveyTitle}</Text>
          </Section>

          <Text style={text}>
            {organizationName} values your input and we would greatly appreciate
            your participation. Your feedback helps us improve and better serve
            our team.
          </Text>

          <Section style={urgencyBox}>
            <Text style={urgencyText}>
              <strong>Time Remaining:</strong> {daysRemaining}{' '}
              {daysRemaining === 1 ? 'day' : 'days'}
            </Text>
            {deadline && (
              <Text style={urgencyText}>
                <strong>Deadline:</strong> {deadline}
              </Text>
            )}
          </Section>

          <Section style={buttonContainer}>
            <Button style={button} href={surveyLink}>
              Complete Survey Now
            </Button>
          </Section>

          <Text style={text}>
            Or copy and paste this URL into your browser:
          </Text>
          <Text style={link}>{surveyLink}</Text>

          <Text style={footer}>
            If you have already completed this survey, please disregard this
            reminder. If you have any questions, please contact your
            administrator.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default ReminderEmail;

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const h1 = {
  color: '#1f2937',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0 40px',
  textAlign: 'center' as const,
};

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '26px',
  padding: '0 40px',
  marginBottom: '20px',
};

const highlightBox = {
  backgroundColor: '#fef3c7',
  borderLeft: '4px solid #f59e0b',
  padding: '16px 20px',
  margin: '0 40px 30px',
};

const highlightText = {
  color: '#92400e',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: 0,
};

const urgencyBox = {
  backgroundColor: '#fef2f2',
  borderRadius: '8px',
  padding: '20px',
  margin: '0 40px 30px',
  borderLeft: '4px solid #ef4444',
};

const urgencyText = {
  color: '#991b1b',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '0 0 8px',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '30px 0',
};

const button = {
  backgroundColor: '#0ea5e9',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 32px',
};

const link = {
  color: '#0ea5e9',
  fontSize: '14px',
  textDecoration: 'underline',
  padding: '0 40px',
  wordBreak: 'break-all' as const,
};

const footer = {
  color: '#6b7280',
  fontSize: '12px',
  lineHeight: '20px',
  padding: '0 40px',
  marginTop: '40px',
  borderTop: '1px solid #e5e7eb',
  paddingTop: '20px',
};
