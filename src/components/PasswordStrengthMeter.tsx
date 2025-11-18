import { useMemo } from 'react';
import { Progress } from '@/components/ui/progress';
import { Check, X } from 'lucide-react';

interface PasswordStrengthMeterProps {
  password: string;
}

interface Requirement {
  label: string;
  met: boolean;
}

export const PasswordStrengthMeter = ({ password }: PasswordStrengthMeterProps) => {
  const requirements = useMemo((): Requirement[] => {
    return [
      { label: 'At least 8 characters', met: password.length >= 8 },
      { label: 'Contains uppercase letter', met: /[A-Z]/.test(password) },
      { label: 'Contains lowercase letter', met: /[a-z]/.test(password) },
      { label: 'Contains number', met: /[0-9]/.test(password) },
      { label: 'Contains special character', met: /[^A-Za-z0-9]/.test(password) },
    ];
  }, [password]);

  const strength = useMemo(() => {
    const metCount = requirements.filter(r => r.met).length;
    const lengthBonus = password.length >= 12 ? 1 : 0;
    const totalScore = metCount + lengthBonus;

    if (totalScore <= 2) return { label: 'Weak', value: 20, color: 'bg-destructive' };
    if (totalScore === 3) return { label: 'Fair', value: 40, color: 'bg-orange-500' };
    if (totalScore === 4) return { label: 'Good', value: 60, color: 'bg-yellow-500' };
    if (totalScore === 5) return { label: 'Strong', value: 80, color: 'bg-primary' };
    return { label: 'Very Strong', value: 100, color: 'bg-green-600' };
  }, [requirements, password]);

  if (!password) return null;

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Password strength:</span>
          <span className={`font-medium ${
            strength.label === 'Weak' ? 'text-destructive' :
            strength.label === 'Fair' ? 'text-orange-500' :
            strength.label === 'Good' ? 'text-yellow-600' :
            strength.label === 'Strong' ? 'text-primary' :
            'text-green-600'
          }`}>
            {strength.label}
          </span>
        </div>
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full transition-all duration-300 ${strength.color}`}
            style={{ width: `${strength.value}%` }}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        {requirements.map((req, index) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            {req.met ? (
              <Check className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
            ) : (
              <X className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            )}
            <span className={req.met ? 'text-foreground' : 'text-muted-foreground'}>
              {req.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
