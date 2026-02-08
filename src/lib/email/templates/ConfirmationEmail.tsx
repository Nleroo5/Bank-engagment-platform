import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface ConfirmationEmailProps {
  surveyTitle: string;
  organizationName: string;
  completedAt: string;
}

export function ConfirmationEmail({
  surveyTitle,
  organizationName,
  completedAt,
}: ConfirmationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Thank you for completing: {surveyTitle}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={checkmarkContainer}>
            <Text style={checkmark}>✓</Text>
          </Section>

          <Heading style={h1}>Thank You!</Heading>

          <Text style={text}>
            Your survey response has been successfully submitted.
          </Text>

          <Section style={infoBox}>
            <Text style={infoText}>
              <strong>Survey:</strong> {surveyTitle}
            </Text>
            <Text style={infoText}>
              <strong>Completed:</strong> {completedAt}
            </Text>
          </Section>

          <Text style={text}>
            {organizationName} greatly appreciates your participation. Your
            feedback is valuable and will help us improve our organization and
            better serve our team.
          </Text>

          <Text style={text}>
            Your responses have been recorded and will be kept strictly
            confidential. Individual responses will never be shared and will
            only be reported in aggregate form.
          </Text>

          <Section style={confidentialityBox}>
            <Text style={confidentialityText}>
              <strong>Privacy Notice</strong>
            </Text>
            <Text style={confidentialityText}>
              Your responses are completely confidential and anonymous. We value
              your honest feedback and are committed to protecting your privacy.
            </Text>
          </Section>

          <Text style={footer}>
            If you have any questions about this survey or need assistance,
            please contact your survey administrator.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default ConfirmationEmail;

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

const checkmarkContainer = {
  textAlign: 'center' as const,
  margin: '40px 0 20px',
};

const checkmark = {
  fontSize: '64px',
  color: '#10b981',
  margin: 0,
};

const h1 = {
  color: '#1f2937',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '20px 0',
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
  backgroundColor: '#f0fdf4',
  borderRadius: '8px',
  padding: '20px',
  margin: '0 40px 30px',
  borderLeft: '4px solid #10b981',
};

const infoText = {
  color: '#166534',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '0 0 8px',
};

const confidentialityBox = {
  backgroundColor: '#eff6ff',
  borderRadius: '8px',
  padding: '20px',
  margin: '30px 40px',
};

const confidentialityText = {
  color: '#1e40af',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0 0 8px',
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
