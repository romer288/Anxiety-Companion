import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function HelpPage() {
  return (
    <div className="container mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold mb-4">Help Center</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
          <CardDescription>Find answers to common questions about using Anxiety Companion</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>How does the AI companion work?</AccordionTrigger>
              <AccordionContent>
                Our AI companion uses advanced natural language processing to provide personalized support based on your needs. It's trained on evidence-based anxiety management techniques from mental health professionals.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-2">
              <AccordionTrigger>Is my data private and secure?</AccordionTrigger>
              <AccordionContent>
                Yes, we take your privacy seriously. All conversations with the AI are encrypted, and we never share your personal information with third parties without your consent. You can read more in our Privacy Policy.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-3">
              <AccordionTrigger>Can I use this app without a therapist?</AccordionTrigger>
              <AccordionContent>
                Yes, Anxiety Companion can be used independently. However, it's designed to complement professional therapy, not replace it. If you're experiencing severe anxiety, we recommend consulting with a mental health professional.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-4">
              <AccordionTrigger>How do I track my anxiety over time?</AccordionTrigger>
              <AccordionContent>
                Use our tracking feature to record your anxiety levels and triggers. You can view trends and patterns in the Analytics section. This information can help you identify triggers and track your progress.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-5">
              <AccordionTrigger>How does therapist matching work?</AccordionTrigger>
              <AccordionContent>
                Our therapist matching feature connects you with licensed professionals based on your location, specific needs, and preferences. All therapists on our platform are vetted and specialize in anxiety management.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Contact Support</CardTitle>
          <CardDescription>Can't find what you're looking for? Reach out to our support team.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            If you have questions that aren't answered in our FAQ, please contact our support team. We're here to help and typically respond within 24 hours.
          </p>
          <p className="font-medium">Email: support@anxietycompanion.com</p>
        </CardContent>
      </Card>
    </div>
  );
}