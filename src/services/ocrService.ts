import axios from "axios";
import FormData from "form-data";

export type ScannedFields = {
  plate: string | null;
  vin: string | null;
  brand: string | null;
  model: string | null;
  ownerName: string | null;
  cin: string | null;
  dpmc: string | null;
  address: string | null;
};

export const ocrService = {
  async extractCarteGrise(
    imageBuffer: Buffer,
    mimeType: string,
  ): Promise<ScannedFields> {
    const apiKey = process.env.OCR_SPACE_API_KEY;
    if (!apiKey) throw new Error("OCR_SPACE_API_KEY not defined");

    console.log("OCR: buffer size →", imageBuffer.length);
    console.log("OCR: mimeType →", mimeType);

    const formData = new FormData();
    formData.append("language", "ara");
    formData.append("isOverlayRequired", "false");
    formData.append("detectOrientation", "true");
    formData.append("scale", "true");
    formData.append("OCREngine", "1");

    const ext = mimeType === "image/png" ? "png" : "jpeg";
    formData.append("file", imageBuffer, {
      filename: `carte_grise.${ext}`,
      contentType: mimeType,
    });

    const response = await axios.post(
      "https://api.ocr.space/parse/image",
      formData,
      {
        headers: {
          apikey: apiKey,
          ...formData.getHeaders(),
        },
      },
    );

    const result = response.data;
    if (!result?.ParsedResults?.length) {
      console.log("OCR bad response →", JSON.stringify(result, null, 2));
      throw new Error("Invalid response from OCR service");
    }

    const text: string = result.ParsedResults[0].ParsedText || "";
    console.log("OCR raw text →", JSON.stringify(text));

    // Split into lines for easier parsing
    const lines = text
      .split(/\r\n|\n/)
      .map((l: string) => l.trim())
      .filter(Boolean);

    const findLineAfter = (keywords: string[]): string | null => {
      for (const keyword of keywords) {
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes(keyword)) {
            // Check same line first (after the keyword)
            const sameLine = lines[i].replace(keyword, "").trim();
            if (sameLine.length > 1) return sameLine;
            // Otherwise next line
            if (lines[i + 1]) return lines[i + 1].trim();
          }
        }
      }
      return null;
    };

    // VIN — 17 chars alphanumeric, may have OCR noise around it
    let vin: string | null = null;
    const vinFragmentMatch =
      text.match(/([A-Z0-9±]{6,})\s*(?:±ZF|ZF)/i) ||
      text.match(/(ZF[A-Z0-9±]{10,})/i) ||
      text.match(/([A-Z0-9±]{15,20})/i);

    if (vinFragmentMatch) {
      let raw = vinFragmentMatch[0].replace(/±/g, "").replace(/\s/g, "");

      // Reverse if it doesn't start with known VIN prefix
      if (!raw.match(/^[A-Z]{2,3}/)) {
        raw = raw.split("").reverse().join("");
      }

      // Fix common OCR mistakes
      vin = raw
        .replace(/O/g, "0") // letter O → digit 0
        .replace(/I/g, "1") // letter I → digit 1
        .replace(/S/g, "5") // letter S → digit 5
        .toUpperCase();

      if (vin.length < 10) vin = null;
    }
    // CIN — 8 digits near CIN/MF markers
    const cinMatch = text.match(/(?:CIN|MF|م ح|م\.ج)[\s\S]{0,10}?(\d{8})/);
    const cin = cinMatch ? cinMatch[1] : null;

    // DPMC date
    const dpmcMatch = text.match(
      /DPMC\s*([0-9]{4}[\/\-][0-9]{2}[\/\-][0-9]{2}|[0-9]{2}[\/\-][0-9]{2}[\/\-][0-9]{4})/i,
    );
    const dpmc = dpmcMatch ? dpmcMatch[1] : null;

    // Plate — Tunisian format: digits + تونس/tunis + digits
    // OCR often misreads it so also try to find registration number
    // Tunisian plate: [number] تونس [number] OR just find the registration numbers
    const plateMatch =
      text.match(/(\d+)\s*(تونس|tunis|TUNIS)\s*(\d+)/i) ||
      text.match(/(\d{2,4})\s+(\d{3,4})/); // fallback: two number groups

    const plate = plateMatch
      ? plateMatch[3]
        ? `${plateMatch[1]} تونس ${plateMatch[3]}`
        : `${plateMatch[1]} تونس ${plateMatch[2]}`
      : null;

    // Owner name — after الإسم واللفب or الاسم واللقب
    const ownerName = findLineAfter(["الإسم واللفر", "الاسم واللقب", "واللقب"]);

    // Address — after العنوان or Adresse
    const address = findLineAfter(["العنوار", "العنوان", "Adresse"]);

    const brandLine = findLineAfter([
      "Constructeur",
      "lonstructeur",
      "الصانع",
      "constructeur",
    ]);

    // Known brands lookup — if OCR garbles it, match closest
    const KNOWN_BRANDS = [
      "FIAT",
      "KIA",
      "TOYOTA",
      "VOLKSWAGEN",
      "RENAULT",
      "PEUGEOT",
      "HYUNDAI",
      "FORD",
      "HONDA",
      "NISSAN",
      "BMW",
      "MERCEDES",
      "SUZUKI",
      "MITSUBISHI",
      "MAZDA",
      "SEAT",
      "SKODA",
      "OPEL",
      "CITROEN",
      "DACIA",
    ];

    let brand: string | null = null;

    // First try: scan entire text for known brand names
    const upperText = text.toUpperCase();
    brand = KNOWN_BRANDS.find((b) => upperText.includes(b)) || null;

    // Second try: look near constructeur keyword
    if (!brand) {
      const brandLine = findLineAfter([
        "Constructeur",
        "lonstructeur",
        "الصانع",
        "constructeur",
      ]);
      if (brandLine) {
        const upper = brandLine.toUpperCase();
        brand = KNOWN_BRANDS.find((b) => upper.includes(b)) || brandLine;
      }
    }

    // Model — after Type commercial / النوع التجاري
    // From the raw text we can see PUNTO is on its own line after النوع التحاري
    const model =
      findLineAfter([
        "النوع التحاري",
        "النوع التجاري",
        "commercial Type",
        "Type commercial",
      ]) ||
      text.match(
        /\b(PUNTO|CLIO|GOLF|YARIS|PICANTO|SPORTAGE|TUCSON|MEGANE|208|308|SYMBOL|LOGAN)\b/i,
      )?.[0] ||
      null;

    const fields = { plate, vin, brand, model, ownerName, cin, dpmc, address };
    console.log("OCR extracted fields →", JSON.stringify(fields, null, 2));

    return fields;
  },
};
