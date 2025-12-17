import { SignupStep3Data } from "@/types/signup";

export interface Step3Props {
  data: SignupStep3Data;
  onChange: <K extends keyof SignupStep3Data>(
    key: K,
    value: SignupStep3Data[K]
  ) => void;
}
