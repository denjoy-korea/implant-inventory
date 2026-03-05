import { useCallback, useState } from 'react';
import { formatPhoneNumber } from './analyzeInputUtils';

export function useAnalyzeLeadFormState() {
  const [emailSent, setEmailSent] = useState(false);
  const [leadEmail, setLeadEmail] = useState('');
  const [wantDetailedAnalysis, setWantDetailedAnalysis] = useState(false);
  const [leadHospital, setLeadHospital] = useState('');
  const [leadRegion, setLeadRegion] = useState('');
  const [leadContact, setLeadContact] = useState('');
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);
  const [leadSubmitError, setLeadSubmitError] = useState('');

  const clearLeadSubmitError = useCallback(() => {
    setLeadSubmitError('');
  }, []);

  const updateLeadEmail = useCallback((value: string) => {
    setLeadEmail(value);
    clearLeadSubmitError();
  }, [clearLeadSubmitError]);

  const updateWantDetailedAnalysis = useCallback((value: boolean) => {
    setWantDetailedAnalysis(value);
    clearLeadSubmitError();
  }, [clearLeadSubmitError]);

  const updateLeadHospital = useCallback((value: string) => {
    setLeadHospital(value);
    clearLeadSubmitError();
  }, [clearLeadSubmitError]);

  const updateLeadRegion = useCallback((value: string) => {
    setLeadRegion(value);
    clearLeadSubmitError();
  }, [clearLeadSubmitError]);

  const updateLeadContact = useCallback((value: string) => {
    setLeadContact(formatPhoneNumber(value));
    clearLeadSubmitError();
  }, [clearLeadSubmitError]);

  return {
    emailSent,
    leadEmail,
    wantDetailedAnalysis,
    leadHospital,
    leadRegion,
    leadContact,
    isSubmittingLead,
    leadSubmitError,
    setEmailSent,
    setIsSubmittingLead,
    setLeadSubmitError,
    updateLeadEmail,
    updateWantDetailedAnalysis,
    updateLeadHospital,
    updateLeadRegion,
    updateLeadContact,
  };
}
