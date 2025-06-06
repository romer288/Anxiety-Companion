import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/context/auth-store';
import { cn } from '@/lib/utils';

// UI Components
import { Button } from '@/components/ui/button';
import { 
  MessageSquare, 
  BarChart, 
  HeartPulse, 
  UserCheck, 
  Settings, 
  HelpCircle,
  Home,
  ShieldCheck,
  BookOpen
} from 'lucide-react';

// Define navigation items
const navItems = [
  {
    name: 'Home',
    href: '/',
    icon: Home,
    public: true
  },
  {
    name: 'Chat',
    href: '/chat',
    icon: MessageSquare,
    public: false
  },
  {
    name: 'Track Anxiety',
    href: '/track',
    icon: HeartPulse,
    public: false
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: BarChart,
    public: false
  },
  {
    name: 'Find Therapist',
    href: '/therapists',
    icon: UserCheck,
    public: false
  },
  {
    name: 'Resources',
    href: '/resources',
    icon: BookOpen,
    public: true
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
    public: false
  },
  {
    name: 'Debug',
    href: '/debug',
    icon: HelpCircle,
    public: true
  },
  {
    name: 'Help',
    href: '/help',
    icon: HelpCircle,
    public: true
  },
  {
    name: 'Privacy',
    href: '/privacy',
    icon: ShieldCheck,
    public: true
  }
];

export function Sidebar() {
  const { user } = useAuthStore();
  const location = useLocation();
  
  // Filter items based on auth status
  const filteredNavItems = navItems.filter(item => item.public || user);
  
  return (
    <div className="flex h-full w-full flex-col bg-muted/40">
      <div className="flex h-16 shrink-0 items-center border-b px-6">
        <Link to="/" className="flex items-center space-x-2">
          <img src="/app-icon.png" alt="Logo" className="h-8 w-8" />
          <span className="text-lg font-semibold">Anxiety Companion</span>
        </Link>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {filteredNavItems.map((item) => {
            const isActive = location.pathname === item.href || 
                            (item.href !== '/' && location.pathname.startsWith(item.href));
            
            return (
              <li key={item.name}>
                <Link to={item.href}>
                  <Button
                    variant={isActive ? 'secondary' : 'ghost'}
                    className={cn(
                      'w-full justify-start',
                      isActive ? 'bg-secondary' : 'hover:bg-muted'
                    )}
                  >
                    <item.icon className="mr-2 h-5 w-5" />
                    {item.name}
                  </Button>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      
      {/* Version info */}
      <div className="mb-2 px-4 py-2 text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>Anxiety Companion</span>
          <span>v1.0.0</span>
        </div>
      </div>
    </div>
  );
}