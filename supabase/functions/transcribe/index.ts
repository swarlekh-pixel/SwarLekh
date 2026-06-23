import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // For demo purposes, we'll return a simulated transcription
    // In production, this would use OpenAI Whisper API

    const formData = await req.formData();
    const language = formData.get('language') as string || 'en';

    // Simulated response - in production, send audio to Whisper API
    const transcriptionExamples: Record<string, string> = {
      'en': 'This is a simulated transcription of your voice answer. In production, OpenAI Whisper would convert your speech to text accurately supporting multiple languages.',
      'hi': 'यह आपके आवाज उत्तर का एक सिम्युलेटेड ट्रांसक्रिप्शन है। उत्पादन में, OpenAI Whisper आपके भाषण को सटीक रूप से पाठ में परिवर्तित करेगा।',
      'mr': 'हा तुमच्या आवाज उत्तराचे सिम्युलेटेड ट्रान्सक्रिप्शन आहे. उत्पादनात, OpenAI Whisper तुमच्या भाषणाचे अचूक मजकूरात रूपांतर करेल.',
      'ta': 'இது உங்கள் குரல் பதிலின் ஒரு உருவகப்படுத்தப்பட்ட நகலெடுப்பு ஆகும்.',
    };

    const languages = {
      'en': 'English',
      'hi': 'Hindi',
      'mr': 'Marathi',
      'ta': 'Tamil',
    };

    // Return simulated transcription
    return new Response(JSON.stringify({
      text: transcriptionExamples[language] || transcriptionExamples['en'],
      language: languages[language] || 'English',
      duration: 5.2,
      note: 'This is a simulated transcription. To enable voice-to-text, add OPENAI_API_KEY to your Supabase edge function secrets.',
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in transcription:', error);
    return new Response(
      JSON.stringify({ error: 'Transcription failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
