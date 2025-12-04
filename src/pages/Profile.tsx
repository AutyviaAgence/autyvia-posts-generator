import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Profile() {
  const { user, company, refreshData, signOut } = useAuth();
  const navigate = useNavigate();

  // États du formulaire
  const [name, setName] = useState('');
  const [businessSector, setBusinessSector] = useState('');
  const [services, setServices] = useState<string[]>([]);
  const [targetAudience, setTargetAudience] = useState('');
  const [brandColors, setBrandColors] = useState<string[]>(['#000000', '#ffffff']);
  const [logoUrl, setLogoUrl] = useState('');
  const [toneOfVoice, setToneOfVoice] = useState('');
  const [visualStyle, setVisualStyle] = useState('');
  
  // États UI
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [newService, setNewService] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  // Charger les données de l'entreprise
  useEffect(() => {
    if (company) {
      setName(company.name || '');
      setBusinessSector(company.business_sector || '');
      setServices(company.services || []);
      setTargetAudience(company.target_audience || '');
      setBrandColors(company.brand_colors || ['#000000', '#ffffff']);
      setLogoUrl(company.logo_url || '');
      setToneOfVoice(company.tone_of_voice || '');
      setVisualStyle(company.visual_style || '');
    }
  }, [company]);

  const handleAddService = () => {
    if (newService.trim() && !services.includes(newService.trim())) {
      setServices([...services, newService.trim()]);
      setNewService('');
    }
  };

  const handleRemoveService = (serviceToRemove: string) => {
    setServices(services.filter(s => s !== serviceToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!company?.id) {
      setMessage({ type: 'error', text: 'Erreur : entreprise non trouvée' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('company')
        .update({
          name,
          business_sector: businessSector,
          services,
          target_audience: targetAudience,
          brand_colors: brandColors,
          logo_url: logoUrl || null,
          tone_of_voice: toneOfVoice,
          visual_style: visualStyle,
          updated_at: new Date().toISOString()
        })
        .eq('id', company.id);

      if (error) throw error;

      // Rafraîchir les données du contexte
      await refreshData();

      setMessage({ type: 'success', text: '✅ Profil mis à jour avec succès !' });
      
      // Scroll en haut pour voir le message
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Erreur mise à jour:', error);
      setMessage({ type: 'error', text: 'Erreur lors de la mise à jour' });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  if (!user || !company) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Retour au dashboard
          </button>
          <button
            onClick={handleSignOut}
            className="text-gray-600 hover:text-gray-800"
          >
            Déconnexion
          </button>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Profil de l'entreprise</h1>
          <p className="text-gray-600 mb-8">Configurez les informations de votre entreprise pour personnaliser vos contenus</p>

          {/* Message de succès/erreur */}
          {message && (
            <div className={`mb-6 p-4 rounded-lg ${
              message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nom de l'entreprise */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom de l'entreprise *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ex: Spa Beauté Zen"
              />
            </div>

            {/* Secteur d'activité */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Secteur d'activité *
              </label>
              <select
                value={businessSector}
                onChange={(e) => setBusinessSector(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Sélectionnez un secteur</option>
                <option value="spa-beaute">Spa & Beauté</option>
                <option value="coiffure">Coiffure</option>
                <option value="esthetique">Esthétique médicale</option>
                <option value="bien-etre">Bien-être</option>
                <option value="fitness">Fitness</option>
                <option value="autre">Autre</option>
              </select>
            </div>

            {/* Services */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Services proposés
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newService}
                  onChange={(e) => setNewService(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddService())}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: Massage relaxant"
                />
                <button
                  type="button"
                  onClick={handleAddService}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Ajouter
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {services.map((service, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {service}
                    <button
                      type="button"
                      onClick={() => handleRemoveService(service)}
                      className="hover:text-blue-900"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Audience cible */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Audience cible
              </label>
              <textarea
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ex: Femmes 30-50 ans, professionnelles actives cherchant détente et bien-être"
              />
            </div>

            {/* Couleurs de marque */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Couleurs de marque
              </label>
              <div className="flex gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Couleur principale</label>
                  <input
                    type="color"
                    value={brandColors[0] || '#000000'}
                    onChange={(e) => setBrandColors([e.target.value, brandColors[1] || '#ffffff'])}
                    className="h-12 w-24 rounded cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Couleur secondaire</label>
                  <input
                    type="color"
                    value={brandColors[1] || '#ffffff'}
                    onChange={(e) => setBrandColors([brandColors[0] || '#000000', e.target.value])}
                    className="h-12 w-24 rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Logo URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL du logo (optionnel)
              </label>
              <input
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://exemple.com/logo.png"
              />
            </div>

            {/* Tone of voice */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ton de communication
              </label>
              <select
                value={toneOfVoice}
                onChange={(e) => setToneOfVoice(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Sélectionnez un ton</option>
                <option value="professionnel-chaleureux">Professionnel & Chaleureux</option>
                <option value="luxe-elegant">Luxe & Élégant</option>
                <option value="decontracte-amical">Décontracté & Amical</option>
                <option value="expert-technique">Expert & Technique</option>
                <option value="inspirant-motivant">Inspirant & Motivant</option>
              </select>
            </div>

            {/* Style visuel */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Style visuel
              </label>
              <select
                value={visualStyle}
                onChange={(e) => setVisualStyle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Sélectionnez un style</option>
                <option value="minimaliste">Minimaliste & Épuré</option>
                <option value="luxueux">Luxueux & Sophistiqué</option>
                <option value="naturel">Naturel & Organique</option>
                <option value="moderne">Moderne & Dynamique</option>
                <option value="chaleureux">Chaleureux & Cocooning</option>
              </select>
            </div>

            {/* Bouton de soumission */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
