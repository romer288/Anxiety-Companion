import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/context/auth-store';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, HeartPulse, UserCheck, ArrowRight } from 'lucide-react';

export function HomePage() {
  const { user } = useAuthStore();
  
  return (
    <div className="container mx-auto space-y-8 py-4">
      {/* Hero section */}
      <section className="flex flex-col md:flex-row gap-8 items-center">
        <div className="flex-1 space-y-4">
          <h1 className="text-4xl font-bold leading-tight">
            Managing anxiety between therapy sessions
          </h1>
          <p className="text-xl text-muted-foreground">
            Anxiety Companion provides personalized support when you need it most, with AI assistance that adapts to your needs and connects you with professional therapists.
          </p>
          
          {user ? (
            <div className="flex flex-wrap gap-4">
              <Button size="lg" asChild>
                <Link to="/chat">
                  <MessageSquare className="mr-2 h-5 w-5" />
                  Start Chatting
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/track">
                  <HeartPulse className="mr-2 h-5 w-5" />
                  Track Anxiety
                </Link>
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-4">
              <Button size="lg" asChild>
                <Link to="/register">Get Started</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/login">Log In</Link>
              </Button>
            </div>
          )}
        </div>
        
        <div className="flex-1 max-w-md">
          <img 
            src="/images/hero-image.png" 
            alt="Person using the Anxiety Companion app" 
            className="rounded-lg shadow-xl"
          />
        </div>
      </section>
      
      {/* Features section */}
      <section className="py-8">
        <h2 className="text-2xl font-bold mb-6 text-center">Key Features</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* AI Companion */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center">
                <MessageSquare className="h-5 w-5 mr-2 text-primary" />
                AI Companion
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                Get support when you need it most with our AI companion, which provides evidence-based anxiety management techniques and personalized support.
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="ghost" className="p-0" asChild>
                <Link to="/chat" className="flex items-center">
                  Try it now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
          
          {/* Anxiety Tracking */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center">
                <HeartPulse className="h-5 w-5 mr-2 text-primary" />
                Anxiety Tracking
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                Monitor your anxiety levels over time and identify triggers with our tracking tools. Get insights into patterns and trends in your anxiety.
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="ghost" className="p-0" asChild>
                <Link to="/track" className="flex items-center">
                  Track now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
          
          {/* Therapist Connection */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center">
                <UserCheck className="h-5 w-5 mr-2 text-primary" />
                Find a Therapist
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                Connect with licensed therapists who specialize in anxiety management. Find the right match based on your location and specific needs.
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="ghost" className="p-0" asChild>
                <Link to="/therapists" className="flex items-center">
                  Find therapists
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </section>
      
      {/* Testimonials */}
      <section className="py-8 bg-muted/30 rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-6 text-center">What Users Say</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardContent className="pt-6">
              <p className="italic mb-4">
                "Anxiety Companion has been a game-changer for me. Having support between therapy sessions has made a huge difference in managing my anxiety day-to-day."
              </p>
              <div className="flex items-center">
                <div className="font-semibold">Sarah T.</div>
                <div className="text-muted-foreground ml-2 text-sm">User since 2024</div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <p className="italic mb-4">
                "As a therapist, I appreciate how this app extends the work we do in sessions. The data tracking helps me see patterns I might otherwise miss."
              </p>
              <div className="flex items-center">
                <div className="font-semibold">Dr. Michael R.</div>
                <div className="text-muted-foreground ml-2 text-sm">Clinical Psychologist</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
      
      {/* Call to action */}
      <section className="py-8 text-center space-y-4">
        <h2 className="text-2xl font-bold">
          Start managing your anxiety more effectively today
        </h2>
        <p className="max-w-2xl mx-auto text-muted-foreground">
          Join thousands of users who have found relief with Anxiety Companion's personalized support and tools.
        </p>
        
        {user ? (
          <Button size="lg" asChild>
            <Link to="/chat">Continue to Chat</Link>
          </Button>
        ) : (
          <Button size="lg" asChild>
            <Link to="/register">Create Free Account</Link>
          </Button>
        )}
      </section>
    </div>
  );
}