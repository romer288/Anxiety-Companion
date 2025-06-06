import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';

// Validation schema
const emailLoginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  preferredLanguage: z.enum(['en', 'es', 'pt']).default('en'),
});

const instagramLoginSchema = z.object({
  instagramHandle: z.string().min(1, 'Instagram handle is required'),
  preferredLanguage: z.enum(['en', 'es', 'pt']).default('en'),
});

// Language translations
const translations = {
  en: {
    title: 'Log In',
    emailTab: 'Email',
    instagramTab: 'Instagram',
    emailDesc: 'Log in with your email address',
    instaDesc: 'Quick login with Instagram',
    email: 'Email',
    password: 'Password',
    language: 'Preferred Language',
    english: 'English',
    spanish: 'Spanish',
    portuguese: 'Portuguese', 
    instaHandle: 'Instagram Handle',
    login: 'Log In',
    register: 'Register',
    noAccount: 'Don\'t have an account?',
    loginSuccess: 'Login successful!',
    loginError: 'Login failed',
  },
  es: {
    title: 'Iniciar Sesión',
    emailTab: 'Correo',
    instagramTab: 'Instagram',
    emailDesc: 'Inicia sesión con tu correo electrónico',
    instaDesc: 'Inicio rápido con Instagram',
    email: 'Correo Electrónico',
    password: 'Contraseña',
    language: 'Idioma Preferido',
    english: 'Inglés',
    spanish: 'Español',
    portuguese: 'Portugués',
    instaHandle: 'Usuario de Instagram',
    login: 'Iniciar Sesión',
    register: 'Registrarse',
    noAccount: '¿No tienes una cuenta?',
    loginSuccess: '¡Inicio de sesión exitoso!',
    loginError: 'Error de inicio de sesión',
  },
  pt: {
    title: 'Entrar',
    emailTab: 'Email',
    instagramTab: 'Instagram',
    emailDesc: 'Entre com seu endereço de email',
    instaDesc: 'Login rápido com Instagram',
    email: 'Email',
    password: 'Senha',
    language: 'Idioma Preferido',
    english: 'Inglês',
    spanish: 'Espanhol',
    portuguese: 'Português',
    instaHandle: 'Usuário do Instagram',
    login: 'Entrar',
    register: 'Registrar',
    noAccount: 'Não tem uma conta?',
    loginSuccess: 'Login bem-sucedido!',
    loginError: 'Falha no login',
  }
};

export default function UserLogin() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [language, setLanguage] = useState<'en' | 'es' | 'pt'>('en');
  const t = translations[language];
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  // Email login form
  const emailForm = useForm({
    resolver: zodResolver(emailLoginSchema),
    defaultValues: {
      email: '',
      password: '',
      preferredLanguage: language as 'en' | 'es' | 'pt',
    }
  });

  // Instagram login form
  const instaForm = useForm({
    resolver: zodResolver(instagramLoginSchema),
    defaultValues: {
      instagramHandle: '',
      preferredLanguage: language as 'en' | 'es' | 'pt',
    }
  });

  // Update language in forms when it changes
  React.useEffect(() => {
    emailForm.setValue('preferredLanguage', language);
    instaForm.setValue('preferredLanguage', language);
  }, [language, emailForm, instaForm]);

  // Handle email login
  const handleEmailLogin = async (data: z.infer<typeof emailLoginSchema>) => {
    setLoading(true);
    try {
      const response = await apiRequest('/api/users/login', {
        method: 'POST',
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          preferredLanguage: data.preferredLanguage,
        }),
      });

      // Store user in global state (via React Query)
      queryClient.setQueryData(['currentUser'], response.user);
      
      toast({
        title: t.loginSuccess,
      });

      // Redirect to dashboard
      setLocation('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      toast({
        variant: 'destructive',
        title: t.loginError,
        description: error.message || '',
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle Instagram login
  const handleInstagramLogin = async (data: z.infer<typeof instagramLoginSchema>) => {
    setLoading(true);
    try {
      const response = await apiRequest('/api/users/login', {
        method: 'POST',
        body: JSON.stringify({
          instagramHandle: data.instagramHandle,
          preferredLanguage: data.preferredLanguage,
        }),
      });

      // Store user in global state (via React Query)
      queryClient.setQueryData(['currentUser'], response.user);
      
      toast({
        title: t.loginSuccess,
      });

      // Redirect to dashboard
      setLocation('/dashboard');
    } catch (error) {
      console.error('Instagram login error:', error);
      toast({
        variant: 'destructive',
        title: t.loginError,
        description: error.message || '',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto my-8">
      {/* Language Selector */}
      <div className="absolute top-4 right-4">
        <RadioGroup 
          defaultValue={language} 
          onValueChange={(value) => setLanguage(value as 'en' | 'es' | 'pt')}
          className="flex space-x-2"
        >
          <div className="flex items-center space-x-1">
            <RadioGroupItem value="en" id="lang-en" />
            <Label htmlFor="lang-en" className="cursor-pointer">EN</Label>
          </div>
          <div className="flex items-center space-x-1">
            <RadioGroupItem value="es" id="lang-es" />
            <Label htmlFor="lang-es" className="cursor-pointer">ES</Label>
          </div>
          <div className="flex items-center space-x-1">
            <RadioGroupItem value="pt" id="lang-pt" />
            <Label htmlFor="lang-pt" className="cursor-pointer">PT</Label>
          </div>
        </RadioGroup>
      </div>
      
      <CardHeader>
        <CardTitle className="text-2xl text-center">{t.title}</CardTitle>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="email">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="email">{t.emailTab}</TabsTrigger>
            <TabsTrigger value="instagram">{t.instagramTab}</TabsTrigger>
          </TabsList>
          
          {/* Email Login Form */}
          <TabsContent value="email">
            <CardDescription className="mb-4 text-center">{t.emailDesc}</CardDescription>
            <form onSubmit={emailForm.handleSubmit(handleEmailLogin)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t.email}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  {...emailForm.register('email')}
                />
                {emailForm.formState.errors.email && (
                  <p className="text-sm text-red-500">{emailForm.formState.errors.email.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">{t.password}</Label>
                <Input
                  id="password"
                  type="password"
                  {...emailForm.register('password')}
                />
                {emailForm.formState.errors.password && (
                  <p className="text-sm text-red-500">{emailForm.formState.errors.password.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label>{t.language}</Label>
                <RadioGroup 
                  defaultValue={language}
                  onValueChange={(value) => {
                    setLanguage(value as 'en' | 'es' | 'pt');
                    emailForm.setValue('preferredLanguage', value as 'en' | 'es' | 'pt');
                  }}
                  className="flex flex-col space-y-1"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="en" id="email-lang-en" />
                    <Label htmlFor="email-lang-en">{t.english}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="es" id="email-lang-es" />
                    <Label htmlFor="email-lang-es">{t.spanish}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="pt" id="email-lang-pt" />
                    <Label htmlFor="email-lang-pt">{t.portuguese}</Label>
                  </div>
                </RadioGroup>
              </div>
              
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Loading...' : t.login}
              </Button>
            </form>
          </TabsContent>
          
          {/* Instagram Login Form */}
          <TabsContent value="instagram">
            <CardDescription className="mb-4 text-center">{t.instaDesc}</CardDescription>
            <form onSubmit={instaForm.handleSubmit(handleInstagramLogin)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="instagramHandle">{t.instaHandle}</Label>
                <Input
                  id="instagramHandle"
                  type="text"
                  placeholder="@your_instagram"
                  {...instaForm.register('instagramHandle')}
                />
                {instaForm.formState.errors.instagramHandle && (
                  <p className="text-sm text-red-500">{instaForm.formState.errors.instagramHandle.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label>{t.language}</Label>
                <RadioGroup 
                  defaultValue={language}
                  onValueChange={(value) => {
                    setLanguage(value as 'en' | 'es' | 'pt');
                    instaForm.setValue('preferredLanguage', value as 'en' | 'es' | 'pt');
                  }}
                  className="flex flex-col space-y-1"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="en" id="insta-lang-en" />
                    <Label htmlFor="insta-lang-en">{t.english}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="es" id="insta-lang-es" />
                    <Label htmlFor="insta-lang-es">{t.spanish}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="pt" id="insta-lang-pt" />
                    <Label htmlFor="insta-lang-pt">{t.portuguese}</Label>
                  </div>
                </RadioGroup>
              </div>
              
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Loading...' : t.login}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter className="flex flex-col items-center space-y-2">
        <div className="flex items-center space-x-1">
          <span className="text-sm text-muted-foreground">{t.noAccount}</span>
          <Button variant="link" className="p-0 h-auto" onClick={() => setLocation('/register')}>
            {t.register}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}