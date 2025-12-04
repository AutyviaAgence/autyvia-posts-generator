import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface Template {
  id: string;
  name: string;
  category: string;
  prompt_base: string;
  thumbnail_url: string | null;
  works_best_for: string[];
  platforms: string[];
  formats: string[];
}

type Step = 1 | 2 | 3;

export default function PostGenerator() {
  const { user, company, pack, signOut } = useAuth();
  const navigate = useNavigate();

  // Étapes
  const [currentStep, setCurrentStep] = useState<Step>(1);

  // Étape 1 : Plateforme et Format
  const [platform, setPlatform] = useState<string>('');
  const [format, setFormat] = useState<string>('');

  // Étape 2 : Template
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Étape 3 : Génération
  const [userSuggestions, setUserSuggestions] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedPost, setGeneratedPost] = useState<{
    image_url: string;
    caption: string;
    hashtags: string[];
  } | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  // Charger les templates quand on arrive à l'étape 2
  useEffect(() => {
    if (currentStep === 2 && platform && format) {
      loadTemplates();
    }
  }, [currentStep, platform, format]);

  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      // Charger TOUS les templates actifs pour cette plateforme/format
      const { data, error } = await supabase
        .from('template')
        .select('*')
        .eq('is_active', true)
        .contains('platforms', [platform])
        .contains('formats', [format]);

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Erreur chargement templates:', error);
      setTemplates([]);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleGenerate = async () => {
    if (!company?.id || !selectedTemplate) return;

    // Vérifier la limite de posts
    if (pack && pack.posts_used >= pack.monthly_posts_limit) {
      alert('Vous avez atteint votre limite mensuelle de posts !');
      return;
    }

    setGenerating(true);

    try {
      // Appel au webhook n8n
      const response = await fetch(import.meta.env.VITE_N8N_API_URL || '', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_id: company.id,
          company_name: company.name,
          business_sector: company.business_sector,
          services: company.services,
          target_audience: company.target_audience,
          brand_colors: company.brand_colors,
          tone_of_voice: company.tone_of_voice,
          visual_style: company.visual_style,
          platform,
          format,
          template_id: selectedTemplate.id,
          template_name: selectedTemplate.name,
          prompt_base: selectedTemplate.prompt_base,
          user_suggestions: userSuggestions,
        }),
      });

      if (!response.ok) throw new Error('Erreur génération');

      const data = await response.json();

      // Sauvegarder dans Supabase
      const { error: insertError } = await supabase.from('generated_post').insert({
        company_id: company.id,
        platform,
        format,
        template_id: selectedTemplate.id,
        user_suggestions: userSuggestions,
        image_url: data.image_url,
        caption_text: data.caption,
        hashtags: data.hashtags,
        created_at: new Date().toISOString(),
      });

      if (insertError) throw insertError;

      // Incrémenter le compteur de posts
      if (pack) {
        await supabase
          .from('pack')
          .update({ posts_used: pack.posts_used + 1 })
          .eq('id', pack.id);
      }

      setGeneratedPost({
        image_url: data.image_url,
        caption: data.caption,
        hashtags: data.hashtags,
      });
    } catch (error) {
      console.error('Erreur génération:', error);
      alert('Erreur lors de la génération du post. Réessayez.');
    } finally {
      setGenerating(false);
    }
  };

  const resetGenerator = () => {
    setCurrentStep(1);
    setPlatform('');
    setFormat('');
    setSelectedTemplate(null);
    setUserSuggestions('');
    setGeneratedPost(null);
    setCategoryFilter('all');
  };

  if (!user || !company) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-600">Chargement...</div>
      </div>
    );
  }

  const platforms = [
    { id: 'instagram', name: 'Instagram', emoji: '📸' },
    { id: 'facebook', name: 'Facebook', emoji: '👥' },
    { id: 'linkedin', name: 'LinkedIn', emoji: '💼' },
  ];

  const formats = [
    { id: 'post', name: 'Post', emoji: '🖼️' },
    { id: 'story', name: 'Story', emoji: '📱' },
    { id: 'carousel', name: 'Carrousel', emoji: '📚' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              ← Retour au dashboard
            </button>
            <button onClick={signOut} className="text-sm text-gray-600 hover:text-gray-900">
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Générateur de posts</h1>
        <p className="text-gray-600 mb-8">
          Créez du contenu personnalisé pour vos réseaux sociaux en 3 étapes
        </p>

        {/* Indicateur d'étapes */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    currentStep >= step
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {step}
                </div>
                {step < 3 && (
                  <div
                    className={`flex-1 h-1 mx-2 ${
                      currentStep > step ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-sm">
            <span className={currentStep >= 1 ? 'text-blue-600 font-medium' : 'text-gray-500'}>
              Plateforme
            </span>
            <span className={currentStep >= 2 ? 'text-blue-600 font-medium' : 'text-gray-500'}>
              Template
            </span>
            <span className={currentStep >= 3 ? 'text-blue-600 font-medium' : 'text-gray-500'}>
              Génération
            </span>
          </div>
        </div>

        {/* Étape 1 : Choix plateforme et format */}
        {currentStep === 1 && (
          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              Choisissez une plateforme et un format
            </h2>

            {/* Plateformes */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Plateforme *
              </label>
              <div className="grid grid-cols-3 gap-4">
                {platforms.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPlatform(p.id)}
                    className={`p-6 rounded-lg border-2 transition-all ${
                      platform === p.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-4xl mb-2">{p.emoji}</div>
                    <div className="font-medium text-gray-900">{p.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Formats */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-3">Format *</label>
              <div className="grid grid-cols-3 gap-4">
                {formats.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFormat(f.id)}
                    className={`p-6 rounded-lg border-2 transition-all ${
                      format === f.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-4xl mb-2">{f.emoji}</div>
                    <div className="font-medium text-gray-900">{f.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Bouton suivant */}
            <button
              onClick={() => setCurrentStep(2)}
              disabled={!platform || !format}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Continuer →
            </button>
          </div>
        )}
	{/* Étape 2 : Choix template */}
	{currentStep === 2 && (
	 <div className="bg-white rounded-lg shadow-md p-8">
	<h2 className="text-xl font-bold text-gray-900 mb-6">Choisissez un template</h2>

	    {loadingTemplates ? (
	 <div className="text-center py-12 text-gray-500">
	 Chargement des templates...
	</div>
    ) : templates.length === 0 ? (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">
          Aucun template disponible pour cette combinaison
        </p>
        <button
          onClick={() => setCurrentStep(1)}
          className="text-blue-600 hover:text-blue-700"
        >
          ← Retour
        </button>
      </div>
    ) : (
      <>
        {/* Filtre par catégorie */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Filtrer par catégorie
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                categoryFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tous ({templates.length})
            </button>
            {Array.from(new Set(templates.map((t) => t.category))).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors capitalize ${
                  categoryFilter === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cat} ({templates.filter((t) => t.category === cat).length})
              </button>
            ))}
          </div>
        </div>

        {/* Interface 2 colonnes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Colonne gauche : Liste scrollable des templates */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">
                Templates disponibles (
                {templates.filter((t) => categoryFilter === 'all' || t.category === categoryFilter).length}
                )
              </h3>
            </div>
            <div className="overflow-y-auto max-h-[500px] divide-y divide-gray-200">
              {templates
                .filter((t) => categoryFilter === 'all' || t.category === categoryFilter)
                .map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template)}
                    className={`w-full p-4 text-left transition-all hover:bg-gray-50 ${
                      selectedTemplate?.id === template.id
                        ? 'bg-blue-50 border-l-4 border-blue-600'
                        : 'border-l-4 border-transparent'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Thumbnail miniature */}
                      {template.thumbnail_url ? (
                        <img
                          src={template.thumbnail_url}
                          alt={template.name}
                          className="w-16 h-16 rounded object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
                          <span className="text-2xl">✨</span>
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-900 mb-1 truncate">
                          {template.name}
                        </h4>
                        <p className="text-xs text-gray-600 capitalize mb-1">
                          {template.category}
                        </p>
                        <p className="text-xs text-gray-500 line-clamp-2">
                          {template.prompt_base}
                        </p>
                      </div>
                      
                      {/* Indicateur de sélection */}
                      {selectedTemplate?.id === template.id && (
                        <div className="flex-shrink-0 text-blue-600">
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
            </div>
          </div>

          {/* Colonne droite : Prévisualisation du template sélectionné */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            {selectedTemplate ? (
              <div className="h-full flex flex-col">
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3">
                  <h3 className="font-bold text-white">Aperçu du template</h3>
                </div>
                
                <div className="flex-1 overflow-y-auto max-h-[500px] p-6">
                  {/* Image de référence */}
                  {selectedTemplate.thumbnail_url ? (
                    <div className="mb-6">
                      <img
                        src={selectedTemplate.thumbnail_url}
                        alt={selectedTemplate.name}
                        className="w-full rounded-lg shadow-md"
                      />
                    </div>
                  ) : (
                    <div className="mb-6 aspect-square rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                      <span className="text-6xl">✨</span>
                    </div>
                  )}
                  
                  {/* Nom et catégorie */}
                  <h4 className="text-2xl font-bold text-gray-900 mb-2">
                    {selectedTemplate.name}
                  </h4>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 capitalize">
                      {selectedTemplate.category}
                    </span>
                  </div>
                  
                  {/* Description complète */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <h5 className="font-semibold text-gray-900 mb-2">Description</h5>
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {selectedTemplate.prompt_base}
                    </p>
                  </div>
                  
                  {/* Informations complémentaires */}
                  <div className="space-y-3">
                    <div>
                      <h5 className="font-semibold text-gray-900 text-sm mb-2">
                        Idéal pour
                      </h5>
                      <div className="flex flex-wrap gap-2">
                        {selectedTemplate.works_best_for?.map((sector, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs capitalize"
                          >
                            {sector}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h5 className="font-semibold text-gray-900 text-sm mb-2">
                        Plateformes compatibles
                      </h5>
                      <div className="flex flex-wrap gap-2">
                        {selectedTemplate.platforms?.map((plat, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs capitalize"
                          >
                            {plat}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h5 className="font-semibold text-gray-900 text-sm mb-2">
                        Formats disponibles
                      </h5>
                      <div className="flex flex-wrap gap-2">
                        {selectedTemplate.formats?.map((fmt, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs capitalize"
                          >
                            {fmt}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-[500px] flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <div className="text-6xl mb-4">👈</div>
                  <p className="text-lg font-medium">Sélectionnez un template</p>
                  <p className="text-sm mt-2">pour voir l'aperçu et les détails</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Message si aucun template après filtrage */}
        {templates.filter((t) => categoryFilter === 'all' || t.category === categoryFilter)
          .length === 0 && (
          <div className="text-center py-8 text-gray-500 mb-6">
            Aucun template dans cette catégorie
          </div>
        )}

        {/* Boutons de navigation */}
        <div className="flex gap-4">
          <button
            onClick={() => setCurrentStep(1)}
            className="flex-1 border-2 border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            ← Retour
          </button>
          <button
            onClick={() => setCurrentStep(3)}
            disabled={!selectedTemplate}
            className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Continuer →
          </button>
        </div>
      </>
    )}
  </div>
)}



        {/* Étape 3 : Génération */}
        {currentStep === 3 && !generatedPost && (
          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Personnalisez votre post</h2>

            {/* Récap */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600 mb-2">Vous avez sélectionné :</p>
              <div className="flex gap-2 flex-wrap">
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  {platforms.find((p) => p.id === platform)?.name}
                </span>
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                  {formats.find((f) => f.id === format)?.name}
                </span>
                <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                  {selectedTemplate?.name}
                </span>
              </div>
            </div>

            {/* Suggestions personnalisées */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Suggestions personnalisées (optionnel)
              </label>
              <textarea
                value={userSuggestions}
                onChange={(e) => setUserSuggestions(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ex: Mettre en avant notre nouvelle promo de -20%, mentionner nos horaires d'ouverture étendus..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Ces suggestions seront prises en compte lors de la génération
              </p>
            </div>

            {/* Boutons */}
            <div className="flex gap-4">
              <button
                onClick={() => setCurrentStep(2)}
                className="flex-1 border-2 border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                ← Retour
              </button>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {generating ? 'Génération en cours...' : '✨ Générer le post'}
              </button>
            </div>
          </div>
        )}

        {/* Résultat */}
        {generatedPost && (
          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Votre post est prêt ! 🎉</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Image */}
              <div>
                <img
                  src={generatedPost.image_url}
                  alt="Post généré"
                  className="w-full rounded-lg shadow-md"
                />
              </div>

              {/* Caption */}
              <div>
                <h3 className="font-bold text-gray-900 mb-2">Légende</h3>
                <p className="text-gray-700 whitespace-pre-wrap mb-4">
                  {generatedPost.caption}
                </p>

                <h3 className="font-bold text-gray-900 mb-2">Hashtags</h3>
                <div className="flex flex-wrap gap-2">
                  {generatedPost.hashtags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex-1 border-2 border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Retour au dashboard
              </button>
              <button
                onClick={resetGenerator}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Générer un nouveau post
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
