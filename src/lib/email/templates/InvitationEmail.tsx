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

interface InvitationEmailProps {
  surveyTitle: string;
  surveyLink: string;
  organizationName: string;
  deadline?: string;
  estimatedMinutes?: number;
}

export function InvitationEmail({
  surveyTitle,
  surveyLink,
  organizationName,
  deadline,
  estimatedMinutes = 15,
}: InvitationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        You&apos;ve been invited to complete: {surveyTitle}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{surveyTitle}</Heading>

          <Text style={text}>
            You have been invited to participate in a survey by{' '}
            {organizationName}. Your feedback is valuable to us and will help
            improve our organization.
          </Text>

          <Section style={infoBox}>
            <Text style={infoText}>
              <strong>Estimated Time:</strong> {estimatedMinutes} minutes
            </Text>
            {deadline && (
              <Text style={infoText}>
                <strong>Deadline:</strong> {deadline}
              </Text>
            )}
          </Section>

          <Section style={buttonContainer}>
            <Button style={button} href={surveyLink}>
              Start Survey
            </Button>
          </Section>

          <Text style={text}>
            Or copy and paste this URL into your browser:
          </Text>
          <Text style={link}>{surveyLink}</Text>

          <Text style={footer}>
            This is a one-time survey link. Please do not share it with others.
            Your responses will be kept confidential.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default InvitationEmail;

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

const infoBox = {
  backgroundColor: '#f3f4f6',
  borderRadius: '8px',
  padding: '20px',
  margin: '0 40px 30px',
};

const infoText = {
  color: '#374151',
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
