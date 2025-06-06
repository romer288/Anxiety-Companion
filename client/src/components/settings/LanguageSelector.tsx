import { useAuthStore } from '@/context/auth-store';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

interface LanguageSelectorProps {
  onSelect?: () => void;
}

const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
];

export function LanguageSelector({ onSelect }: LanguageSelectorProps) {
  const { profile, updateLanguage } = useAuthStore();
  const { toast } = useToast();
  
  const handleLanguageChange = async (code: 'en' | 'es' | 'pt') => {
    try {
      await updateLanguage(code);
      
      // Show success message in the selected language
      const messages = {
        en: 'Language changed to English',
        es: 'Idioma cambiado a Español',
        pt: 'Idioma alterado para Português',
      };
      
      toast({
        title: messages[code],
        description: code === 'en' 
          ? 'All content will now be displayed in English'
          : code === 'es'
            ? 'Todo el contenido ahora se mostrará en Español'
            : 'Todo o conteúdo agora será exibido em Português',
      });
      
      if (onSelect) {
        onSelect();
      }
    } catch (error) {
      console.error('Error changing language:', error);
      toast({
        title: 'Error',
        description: 'Failed to change language',
        variant: 'destructive',
      });
    }
  };
  
  return (
    <>
      {languages.map((language) => (
        <DropdownMenuItem
          key={language.code}
          onClick={() => handleLanguageChange(language.code as 'en' | 'es' | 'pt')}
          className="cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <span className="text-base">{language.flag}</span>
            <span>{language.name}</span>
            {profile?.language === language.code && (
              <span className="ml-auto text-green-500">✓</span>
            )}
          </div>
        </DropdownMenuItem>
      ))}
    </>
  );
}