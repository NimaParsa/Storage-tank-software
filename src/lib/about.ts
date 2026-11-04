/** Software identity and revision record shown in the settings dialog. */

export const APP_NAME = "TankCalc 650";
export const APP_VERSION = "1.2.0";

/** ISO dates — edit these when the software is revised. */
export const FIRST_REVISION = "2026-11-04";
export const LAST_MODIFIED = "2026-11-04";

export const AUTHOR = {
  name: "Nima Zarrin Parsa",
  phone: "+98 912 261 5271",
  phoneHref: "+989122615271",
  email: "nima.parsa@gmail.com",
  web: "nimaparsa.info",
  webHref: "https://nimaparsa.info",
};

export const formatDate = (iso: string): string => {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};
