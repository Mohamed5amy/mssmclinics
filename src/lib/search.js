const digits = (text) => (text || "").replace(/\D/g, "");

// Matches a patient by name or by any part of the phone number.
export const matchesPatient = (patient, query) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const number = digits(q);
    return patient.name?.toLowerCase().includes(q) || (number.length >= 3 && digits(patient.phone).includes(number));
};
