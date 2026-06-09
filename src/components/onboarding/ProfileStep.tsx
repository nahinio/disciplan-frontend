import { useEffect, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { getSignupDraft } from "@/lib/auth";
import type { ProfileData } from "./OnboardingFlow";

const schema = z.object({
  name: z.string().trim().min(2, "Please enter your full name."),
  department: z.string().min(1, "Select your department."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

interface Props {
  initial: ProfileData;
  onSubmit: (data: ProfileData) => void;
}

export function ProfileStep({ initial, onSubmit }: Props) {
  const [name, setName] = useState(initial.name);
  const [department, setDepartment] = useState(initial.department);
  const [departmentId, setDepartmentId] = useState<number | undefined>(initial.departmentId);
  const [password, setPassword] = useState(initial.password);
  const [role, setRole] = useState<"student" | "faculty">(initial.role || "student");
  const [roleLoading, setRoleLoading] = useState(true);
  const [errors, setErrors] = useState<{
    name?: string;
    department?: string;
    password?: string;
  }>({});
  const [departments, setDepartments] = useState<{ id: number; code: string; name: string }[]>([]);

  useEffect(() => {
    api.getDepartments().then((res) => setDepartments(res.items)).catch(() => {});
  }, []);

  useEffect(() => {
    const draft = getSignupDraft();
    if (!draft?.email) {
      setRoleLoading(false);
      return;
    }
    api
      .getSignupRole(draft.email)
      .then((res) => {
        setRole(res.role_code);
        if (res.suggested_name && !initial.name) {
          setName(res.suggested_name);
        }
      })
      .catch(() => setRole("student"))
      .finally(() => setRoleLoading(false));
  }, [initial.name]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = schema.safeParse({ name, department, password });
    if (!result.success) {
      const fieldErrors: typeof errors = {};
      for (const issue of result.error.issues) {
        fieldErrors[issue.path[0] as keyof typeof errors] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    onSubmit({ ...result.data, departmentId, role });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-8">
        <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-rose-600 font-medium">
          <span className="w-1 h-1 rounded-full bg-rose-600" />
          Step 1 of 2
        </span>
        <h1 className="mt-3 font-display text-3xl md:text-4xl tracking-tighter font-semibold leading-[1.05]">
          Set up your profile
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {roleLoading ? (
            "Checking your account type…"
          ) : role === "faculty" ? (
            "Your email is registered as faculty — you'll get the faculty dashboard after setup."
          ) : (
            "A few quick details to personalize your DisciPlan workspace."
          )}
        </p>
      </div>

      {roleLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-xs uppercase tracking-wider text-muted-foreground">
              Full name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Tanvir Rahman"
              className="h-11"
              autoFocus
            />
            {errors.name && <p className="text-xs text-rose-600">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-xs uppercase tracking-wider text-muted-foreground">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="h-11"
            />
            {errors.password && <p className="text-xs text-rose-600">{errors.password}</p>}
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Department</Label>
            <Select
              value={department}
              onValueChange={(code) => {
                setDepartment(code);
                const dept = departments.find((d) => d.code === code);
                setDepartmentId(dept?.id);
              }}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Select your program" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.code}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.department && <p className="text-xs text-rose-600">{errors.department}</p>}
          </div>
        </div>
      )}

      <div className="mt-8 flex justify-end">
        <Button
          type="submit"
          className="h-11 px-6 bg-rose-600 hover:bg-rose-700 text-white"
          disabled={roleLoading}
        >
          Continue
          <ArrowRight className="w-4 h-4 ml-1.5" />
        </Button>
      </div>
    </form>
  );
}
