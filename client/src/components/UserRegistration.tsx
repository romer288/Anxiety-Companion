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

// Validation schema
const emailRegistrationSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  fullName: z.string().optional(),
  zipCode: z.string().optional(),
  city: z.string().optional(),
  age: z.string().optional(),
  preferredLanguage: z.enum(['en', 'es', 'pt']).default('en'),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const instagramRegistrationSchema = z.object({
  instagramHandle: z.string().min(1, 'Instagram handle is required'),
  preferredLanguage: z.enum(['en', 'es', 'pt']).default('en'),
});

// Language translations
const translations = {
  en: {
    title: 'Create Account',
    emailTab: 'Email',
    instagramTab: 'Instagram',
    emailDesc: 'Register with your email address',
    instaDesc: 'Quick signup with Instagram',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    fullName: 'Full Name (Optional)',
    zipCode: 'ZIP Code (Optional)',
    city: 'City (Optional)',
    age: 'Age (Optional)',
    language: 'Preferred Language',
    english: 'English',
    spanish: 'Spanish',
    portuguese: 'Portuguese', 
    instaHandle: 'Instagram Handle',
    register: 'Register',
    login: 'Log in',
    haveAccount: 'Already have an account?',
    agreeTerms: 'By registering, you agree to our Terms and Privacy Policy',
    registerSuccess: 'Registration successful!',
    registerError: 'Registration failed',
  },
  es: {
    title: 'Crear Cuenta',
    emailTab: 'Correo',
    instagramTab: 'Instagram',
    emailDesc: 'Regístrate con tu dirección de correo',
    instaDesc: 'Registro rápido con Instagram',
    email: 'Correo Electrónico',
    password: 'Contraseña',
    confirmPassword: 'Confirmar Contraseña',
    fullName: 'Nombre Completo (Opcional)',
    zipCode: 'Código Postal (Opcional)',
    city: 'Ciudad (Opcional)',
    age: 'Edad (Opcional)',
    language: 'Idioma Preferido',
    english: 'Inglés',
    spanish: 'Español',
    portuguese: 'Portugués',
    instaHandle: 'Usuario de Instagram',
    register: 'Registrar',
    login: 'Iniciar sesión',
    haveAccount: '¿Ya tienes una cuenta?',
    agreeTerms: 'Al registrarte, aceptas nuestros Términos y Política de Privacidad',
    registerSuccess: '¡Registro exitoso!',
    registerError: 'Error en el registro',
  },
  pt: {
    title: 'Criar Conta',
    emailTab: 'Email',
    instagramTab: 'Instagram',
    emailDesc: 'Registre-se com seu endereço de email',
    instaDesc: 'Cadastro rápido com Instagram',
    email: 'Email',
    password: 'Senha',
    confirmPassword: 'Confirmar Senha',
    fullName: 'Nome Completo (Opcional)',
    zipCode: 'CEP (Opcional)',
    city: 'Cidade (Opcional)',
    age: 'Idade (Opcional)',
    language: 'Idioma Preferido',
    english: 'Inglês',
    spanish: 'Espanhol',
    portuguese: 'Português',
    instaHandle: 'Usuário do Instagram',
    register: 'Registrar',
    login: 'Entrar',
    haveAccount: 'Já tem uma conta?',
    agreeTerms: 'Ao se registrar, você concorda com nossos Termos e Política de Privacidade',
    registerSuccess: 'Registro bem-sucedido!',
    registerError: 'Falha no registro',
  }
};

export default function UserRegistration() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [language, setLanguage] = useState<'en' | 'es' | 'pt'>('en');
  const t = translations[language];
  const [loading, setLoading] = useState(false);

  // Email registration form
  const emailForm = useForm({
    resolver: zodResolver(emailRegistrationSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      fullName: '',
      zipCode: '',
      city: '',
      age: '',
      preferredLanguage: language as 'en' | 'es' | 'pt',
    }
  });

  // Instagram registration form
  const instaForm = useForm({
    resolver: zodResolver(instagramRegistrationSchema),
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

  // Handle email registration
  const handleEmailRegistration = async (data: z.infer<typeof emailRegistrationSchema>) => {
    setLoading(true);
    try {
      // Convert age to number if provided
      const ageValue = data.age ? parseInt(data.age) : undefined;
      
      const response = await apiRequest('/api/users/register', {
        method: 'POST',
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          fullName: data.fullName,
          zipCode: data.zipCode,
          city: data.city,
          age: ageValue,
          preferredLanguage: data.preferredLanguage,
        }),
      });

      toast({
        title: t.registerSuccess,
        description: response.message || '',
      });

      // Redirect to login or dashboard
      setLocation('/login');
    } catch (error) {
      console.error('Registration error:', error);
      toast({
        variant: 'destructive',
        title: t.registerError,
        description: error.message || '',
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle Instagram registration
  const handleInstagramRegistration = async (data: z.infer<typeof instagramRegistrationSchema>) => {
    setLoading(true);
    try {
      const response = await apiRequest('/api/users/register', {
        method: 'POST',
        body: JSON.stringify({
          instagramHandle: data.instagramHandle,
          preferredLanguage: data.preferredLanguage,
        }),
      });

      toast({
        title: t.registerSuccess,
        description: response.message || '',
      });

      // Redirect to login or dashboard
      setLocation('/login');
    } catch (error) {
      console.error('Instagram registration error:', error);
      toast({
        variant: 'destructive',
        title: t.registerError,
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
          
          {/* Email Registration Form */}
          <TabsContent value="email">
            <CardDescription className="mb-4 text-center">{t.emailDesc}</CardDescription>
            <form onSubmit={emailForm.handleSubmit(handleEmailRegistration)} className="space-y-4">
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
                <Label htmlFor="confirmPassword">{t.confirmPassword}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  {...emailForm.register('confirmPassword')}
                />
                {emailForm.formState.errors.confirmPassword && (
                  <p className="text-sm text-red-500">{emailForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="fullName">{t.fullName}</Label>
                <Input
                  id="fullName"
                  type="text"
                  {...emailForm.register('fullName')}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="zipCode">{t.zipCode}</Label>
                  <Input
                    id="zipCode"
                    type="text"
                    {...emailForm.register('zipCode')}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="age">{t.age}</Label>
                  <Input
                    id="age"
                    type="number"
                    min="13"
                    max="120"
                    {...emailForm.register('age')}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="city">{t.city}</Label>
                <Input
                  id="city"
                  type="text"
                  {...emailForm.register('city')}
                />
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
                {loading ? 'Loading...' : t.register}
              </Button>
            </form>
          </TabsContent>
          
          {/* Instagram Registration Form */}
          <TabsContent value="instagram">
            <CardDescription className="mb-4 text-center">{t.instaDesc}</CardDescription>
            <form onSubmit={instaForm.handleSubmit(handleInstagramRegistration)} className="space-y-4">
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
                {loading ? 'Loading...' : t.register}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter className="flex flex-col items-center space-y-2">
        <p className="text-sm text-muted-foreground text-center">{t.agreeTerms}</p>
        <div className="flex items-center space-x-1">
          <span className="text-sm text-muted-foreground">{t.haveAccount}</span>
          <Button variant="link" className="p-0 h-auto" onClick={() => setLocation('/login')}>
            {t.login}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}