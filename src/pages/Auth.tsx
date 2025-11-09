import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Eye, EyeOff, Package } from 'lucide-react';
import { z } from 'zod';
import assetSlide1 from '@/assets/asset-slide-1.png';
import assetSlide2 from '@/assets/asset-slide-2.png';
import assetSlide3 from '@/assets/asset-slide-3.png';

const carouselSlides = [
  {
    image: assetSlide1,
    title: "Asset Management",
    description: "Track and manage all your company assets from computers to vehicles in one centralized platform"
  },
  {
    image: assetSlide2,
    title: "Real-time Monitoring",
    description: "Monitor asset status, location, and performance with live updates and comprehensive analytics"
  },
  {
    image: assetSlide3,
    title: "Team Collaboration",
    description: "Enable seamless collaboration across departments with role-based access and shared insights"
  }
];

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [Name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  // ✅ Restore Remember Me Values
  useEffect(() => {
    const savedEmail = localStorage.getItem("savedEmail");
    const savedPassword = localStorage.getItem("savedPassword");

    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
    if (savedPassword) {
      setPassword(savedPassword);
    }
  }, []);

  // Carousel auto play
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselSlides.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const authSchema = z.object({
    email: z.string()
      .trim()
      .email('Invalid email address')
      .max(255),
    password: z.string()
      .min(8, 'Password must be at least 8 characters')
      .max(128)
      .regex(/[A-Z]/, 'Password must contain an uppercase letter')
      .regex(/[a-z]/, 'Password must contain a lowercase letter')
      .regex(/[0-9]/, 'Password must contain a number'),
    employeeId: z.string()
      .trim()
      .min(1, 'Employee ID is required')
      .max(25, 'Employee ID must be at most 25 characters')
      .regex(/^[A-Za-z0-9_-]+$/, 'Employee ID must contain only letters, numbers, hyphens, and underscores')
      .optional(),
    Name: z.string()
      .trim()
      .regex(/^[A-Za-z ]+$/, 'Name must contain only letters and spaces')
      .max(25, 'Name must be at most 25 characters')
      .optional(),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate employee ID for signup
    if (!isLogin) {
      if (!employeeId || !employeeId.trim()) {
        toast.error('Employee ID is required');
        return;
      }
      if (employeeId.trim().length > 25) {
        toast.error('Employee ID must be at most 25 characters');
        return;
      }
      if (!/^[A-Za-z0-9_-]+$/.test(employeeId.trim())) {
        toast.error('Employee ID must contain only letters, numbers, hyphens, and underscores');
        return;
      }
    }

    const data = {
      email,
      password,
      ...(!isLogin && { Name, employeeId }),
    };

    const result = authSchema.safeParse(data);
    if (!result.success) {
      toast.error(result.error.issues[0].message);
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (!error) {
          // ✅ Save or Clear Remember Me
          if (rememberMe) {
            localStorage.setItem("savedEmail", email);
            localStorage.setItem("savedPassword", password);
          } else {
            localStorage.removeItem("savedEmail");
            localStorage.removeItem("savedPassword");
          }

          toast.success('Welcome back!');
        } else {
          toast.error(error.message.includes('Invalid login credentials') ? 'Invalid email or password' : error.message);
        }
      } else {
        const normalizedEmployeeId = employeeId ? employeeId.trim().toUpperCase() : '';
        const { error } = await signUp(email, password, Name, normalizedEmployeeId);
        if (error) toast.error(error.message.includes('already registered') ? 'This email is already registered' : error.message);
        else toast.success('Account created successfully!');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden">
        <div className="w-full h-full flex flex-col items-center justify-center p-12 text-white">
          <h1 className="text-4xl font-bold mb-12 text-center">Asset Management</h1>

          <div className="w-full max-w-2xl overflow-hidden relative">
            <div
              className="flex transition-transform duration-700 ease-in-out"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {carouselSlides.map((slide, index) => (
                <div key={index} className="flex-shrink-0 w-full px-4">
                  <div className="flex flex-col items-center text-center space-y-6">
                    <div className="w-full h-80 flex items-center justify-center">
                      <img src={slide.image} alt={slide.title} className="max-h-full object-contain rounded-lg" />
                    </div>
                    <h2 className="text-2xl font-semibold">{slide.title}</h2>
                    <p className="text-lg text-white/90 max-w-md">{slide.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-center gap-2 mt-4">
              {carouselSlides.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 rounded-full transition-all ${index === currentSlide ? 'w-8 bg-white' : 'w-2 bg-white/40'}`}
                  aria-hidden
                />
              ))}
            </div>
          </div>

          <p className="mt-6 text-white/80 text-center">
            Streamline your management<br />with precision and ease
          </p>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-primary rounded-xl">
                <Package className="h-8 w-8 text-primary-foreground" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Solidpro Asset Management</CardTitle>
            <CardDescription>
              Manage your company assets efficiently
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={isLogin ? 'login' : 'signup'} onValueChange={(v) => setIsLogin(v === 'login')} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              {/* LOGIN */}
              <TabsContent value="login" className="space-y-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      placeholder="name@solidpro-es.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Password</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute inset-y-0 right-2 flex items-center px-1 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="remember" 
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked === true)}
                    />
                    <label htmlFor="remember" className="text-sm font-medium cursor-pointer">
                      Remember password
                    </label>
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              </TabsContent>

              {/* SIGNUP */}
              <TabsContent value="signup" className="space-y-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Employee ID</Label>
                    <Input
                      type="text"
                      placeholder="EMP001"
                      value={employeeId}
                      onChange={(e) => {
                        const raw = e.target.value || '';
                        const filtered = raw.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 25);
                        setEmployeeId(filtered);
                      }}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Employee ID will be converted to uppercase
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      type="text"
                      placeholder="John Doe"
                      value={Name}
                      onChange={(e) => {
                        const raw = e.target.value || '';
                        const filtered = raw.replace(/[^A-Za-z ]/g, '').slice(0, 25);
                        setName(filtered);
                      }}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      placeholder="name@solidpro-es.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Password</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Create a password (min 8 characters)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute inset-y-0 right-2 flex items-center px-1 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <Eye className="h-4 w-4 text-muted-foreground" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                      </Button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Creating account...' : 'Create Account'}
                  </Button>
                </form>
              </TabsContent>

            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
