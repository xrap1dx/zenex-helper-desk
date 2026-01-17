import { ChatWidget } from "@/components/chat/ChatWidget";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { 
  MessageCircle, 
  Shield, 
  Users, 
  Zap, 
  ChevronDown,
  Clock,
  HelpCircle,
  FileText,
  Mail
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "How quickly can I expect a response?",
    answer: "Our team typically responds within 5-10 minutes during business hours. For after-hours inquiries, you'll receive a response within 24 hours.",
  },
  {
    question: "What types of issues can support help with?",
    answer: "We can help with account issues, billing questions, technical problems, appeals, legal inquiries, and general questions about our services.",
  },
  {
    question: "How do I appeal a decision or ban?",
    answer: "Click the chat icon below and select 'Appeal a Decision'. Our Appeals Team will review your case and respond within 48 hours.",
  },
  {
    question: "Is my chat conversation private?",
    answer: "Yes! All conversations are encrypted and only visible to you and our support team members assigned to help you.",
  },
  {
    question: "Can I request my data under GDPR?",
    answer: "Absolutely. Start a chat and select 'Legal & Compliance' to submit a data request. We'll process it within the legally required timeframe.",
  },
  {
    question: "How do I contact you for business partnerships?",
    answer: "Use the live chat and select 'Partnership Inquiry' to connect with our Client Relations Team.",
  },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated background matching zenex.site aesthetic */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-background" />
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-primary/3 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/2 rounded-full blur-[200px]" />
        {/* Grid overlay */}
        <div 
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--primary)) 1px, transparent 1px),
                              linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}
        />
      </div>

      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold gradient-text">Zenex</span>
          </div>
          <Link to="/staff">
            <Button variant="outline" size="sm" className="backdrop-blur-sm">
              Staff Login
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border/50 bg-muted/50 backdrop-blur-sm text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            Average response time: 5 minutes
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
            How can we{" "}
            <span className="gradient-text">help you</span> today?
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Get instant help from our dedicated support team. We're here 24/7 to assist you with any questions or concerns.
          </p>

          {/* Quick action buttons */}
          <div className="flex flex-wrap justify-center gap-3 pt-4">
            <Button variant="outline" className="gap-2">
              <HelpCircle className="h-4 w-4" />
              General Help
            </Button>
            <Button variant="outline" className="gap-2">
              <FileText className="h-4 w-4" />
              Submit Appeal
            </Button>
            <Button variant="outline" className="gap-2">
              <Mail className="h-4 w-4" />
              Contact Legal
            </Button>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 pt-12">
            <div className="p-6 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 card-shadow group hover:border-primary/50 transition-all">
              <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform">
                <MessageCircle className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="font-semibold mb-2">Live Chat</h3>
              <p className="text-sm text-muted-foreground">
                Connect instantly with our support team through real-time chat.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 card-shadow group hover:border-primary/50 transition-all">
              <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform">
                <Users className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="font-semibold mb-2">Expert Team</h3>
              <p className="text-sm text-muted-foreground">
                Our trained specialists are ready to solve your problems.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 card-shadow group hover:border-primary/50 transition-all">
              <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform">
                <Shield className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="font-semibold mb-2">Secure</h3>
              <p className="text-sm text-muted-foreground">
                Your conversations are private and protected.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto mt-24">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-3">
              Frequently Asked <span className="gradient-text">Questions</span>
            </h2>
            <p className="text-muted-foreground">
              Quick answers to common questions
            </p>
          </div>

          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="border border-border/50 rounded-xl px-6 bg-card/30 backdrop-blur-sm data-[state=open]:border-primary/50 transition-all"
              >
                <AccordionTrigger className="hover:no-underline py-5">
                  <span className="text-left font-medium">{faq.question}</span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* CTA Section */}
        <div className="max-w-2xl mx-auto mt-24 text-center">
          <div className="p-8 rounded-3xl bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border border-primary/20 backdrop-blur-sm">
            <h3 className="text-2xl font-bold mb-3">Still have questions?</h3>
            <p className="text-muted-foreground mb-6">
              Our support team is just a click away. Start a conversation now!
            </p>
            <div className="flex items-center justify-center gap-2 text-primary">
              <MessageCircle className="h-5 w-5 animate-bounce" />
              <span className="font-medium">Click the chat icon below to get started</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 mt-20 py-8 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-6 text-center text-sm text-muted-foreground">
          <p>© 2025 Zenex. All rights reserved.</p>
        </div>
      </footer>

      {/* Chat Widget */}
      <ChatWidget />
    </div>
  );
};

export default Index;
