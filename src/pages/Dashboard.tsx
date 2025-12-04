import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface GeneratedPost {
  id: string;
  platform: string;
  format: string;
  caption_text: string;
  image_url: string;
  created_at: string;
}

export default function Dashboard() {
  const { user, company, pack, signOut } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<GeneratedPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  // Charger les posts récents
  useEffect(() => {
    const loadPosts = async () => {
      if (!company?.id) return;

      try {
        const { data, error } = await supabase
          .from('generated_post')
          .select('*')
          .eq('company_id', company.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) throw error;
        setPosts(data || []);
      } catch (error) {
        console.error('Erreur chargement posts:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPosts();
  }, [company]);

  if (!user || !company) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-600">Chargement...</div>
      </div>
    );
  }

  const postsUsed = pack?.posts_used || 0;
  const postsLimit = pack?.monthly_posts_limit || 30;
  const remainingPosts = postsLimit - postsUsed;
  const usagePercentage = (postsUsed / postsLimit) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/profile')}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Mon profil
              </button>
              <button
                onClick={signOut}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Bienvenue */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Bienvenue, {user.first_name} ! 👋
          </h2>
          <p className="text-gray-600">
            Voici un aperçu de votre activité ce mois-ci
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Posts utilisés */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Posts générés</h3>
              <span className="text-2xl">📊</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{postsUsed}</p>
            <p className="text-sm text-gray-500 mt-1">sur {postsLimit} ce mois</p>
          </div>

          {/* Posts restants */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Posts restants</h3>
              <span className="text-2xl">✨</span>
            </div>
            <p className="text-3xl font-bold text-blue-600">{remainingPosts}</p>
            <p className="text-sm text-gray-500 mt-1">disponibles</p>
          </div>

          {/* Pack actif */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Pack actif</h3>
              <span className="text-2xl">🎯</span>
            </div>
            <p className="text-3xl font-bold text-green-600 capitalize">
              {pack?.pack_type || 'Essential'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {pack?.status === 'active' ? 'Actif' : 'Inactif'}
            </p>
          </div>
        </div>

        {/* Barre de progression */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900">Utilisation mensuelle</h3>
            <span className="text-sm text-gray-600">
              {Math.round(usagePercentage)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className={`h-4 rounded-full transition-all ${
                usagePercentage > 80
                  ? 'bg-red-500'
                  : usagePercentage > 50
                  ? 'bg-yellow-500'
                  : 'bg-green-500'
              }`}
              style={{ width: `${usagePercentage}%` }}
            />
          </div>
          <p className="text-sm text-gray-500 mt-2">
            {remainingPosts > 0
              ? `Il vous reste ${remainingPosts} post${remainingPosts > 1 ? 's' : ''} ce mois`
              : 'Vous avez atteint votre limite mensuelle'}
          </p>
        </div>

        {/* Actions rapides */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <button
            onClick={() => navigate('/generate')}
            className="bg-blue-600 text-white p-8 rounded-lg shadow-md hover:bg-blue-700 transition-colors text-left"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xl font-bold">Générer un nouveau post</h3>
              <span className="text-3xl">✨</span>
            </div>
            <p className="text-blue-100">
              Créez du contenu personnalisé pour vos réseaux sociaux en quelques clics
            </p>
          </button>

          <button
            onClick={() => navigate('/profile')}
            className="bg-white text-gray-900 p-8 rounded-lg shadow-md hover:bg-gray-50 transition-colors text-left border-2 border-gray-200"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xl font-bold">Modifier mon profil</h3>
              <span className="text-3xl">⚙️</span>
            </div>
            <p className="text-gray-600">
              Configurez vos informations pour des contenus encore plus personnalisés
            </p>
          </button>
        </div>

        {/* Liste des posts récents */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Posts récents
          </h3>

          {loading ? (
            <div className="text-center py-8 text-gray-500">Chargement...</div>
          ) : posts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">Aucun post généré pour le moment</p>
              <button
                onClick={() => navigate('/generate')}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Créer mon premier post
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {post.image_url && (
                    <img
                      src={post.image_url}
                      alt="Post"
                      className="w-20 h-20 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {post.platform}
                      </span>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {post.format}
                      </span>
                      <span className="text-xs text-gray-500 ml-auto">
                        {new Date(post.created_at).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 line-clamp-2">
                      {post.caption_text || 'Pas de légende'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
