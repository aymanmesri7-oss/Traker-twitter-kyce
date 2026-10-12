import React, { useState } from 'react';

const sections = [
  {
    title: 'Shadowban - C\'est quoi ?',
    color: '#f97316',
    content: [
      { type: 'text', value: 'Le shadowban c\'est quand Twitter/X rend tes posts invisibles SANS te prevenir. Tu peux toujours poster normalement, mais personne ne voit tes tweets.' },
      { type: 'subtitle', value: 'Ce qui se passe quand tu es shadowban :' },
      { type: 'list', items: [
        'Tes tweets n\'apparaissent PAS dans les recherches',
        'Tes reponses sont cachees sous "Afficher plus"',
        'Ton profil n\'apparait pas dans les suggestions',
        'Tes likes et retweets comptent moins'
      ]},
      { type: 'subtitle', value: 'Les types de shadowban :' },
      { type: 'list', items: [
        'Search Ban - tes tweets invisibles dans la recherche',
        'Ghost Ban - tes reponses cachees pour les autres',
        'Reply Deboosting - tes reponses poussees en bas',
        'Search Suggestion Ban - ton profil introuvable'
      ]},
      { type: 'subtitle', value: 'Comment on verifie :' },
      { type: 'text', value: 'Notre scanner cherche "from:@handle" sur X. Si aucun resultat mais le compte existe = shadowban probable. Le dashboard le detecte automatiquement.' },
    ]
  },
  {
    title: 'Causes du Shadowban',
    color: '#ef4444',
    content: [
      { type: 'subtitle', value: 'Les erreurs qui declenchent un shadowban :' },
      { type: 'list', items: [
        'Poster trop souvent (surtout les nouveaux comptes)',
        'Mettre un lien dans la bio trop tot',
        'Poster des liens dans les tweets trop tot',
        'Copier-coller les memes messages',
        'Suivre/unfollow trop de comptes rapidement',
        'Etre signale par d\'autres utilisateurs',
        'Utiliser des mots sensibles ou interdits',
        'Comportement non-humain (trop rapide, trop regulier)'
      ]},
      { type: 'box', color: '#ef4444', value: 'REGLE D\'OR : Si un compte fait quelque chose qu\'un vrai humain ne ferait pas, Twitter le detecte.' },
    ]
  },
  {
    title: 'Comment sortir du Shadowban',
    color: '#22c55e',
    content: [
      { type: 'subtitle', value: 'Etapes pour recuperer un compte :' },
      { type: 'steps', items: [
        'STOP - Arreter de poster pendant 2-3 jours complets',
        'Retirer tous les liens suspects de la bio',
        'Supprimer les tweets avec des liens',
        'Reprendre avec 1 tweet par jour pendant 3 jours',
        'Augmenter progressivement la frequence',
        'Ne PAS remettre de lien bio avant 1 semaine'
      ]},
      { type: 'box', color: '#22c55e', value: 'La plupart des shadowbans se levent en 3-7 jours si le VA arrete toute activite suspecte.' },
    ]
  },
  {
    title: 'Warm-up - Comment ca marche',
    color: '#a78bfa',
    content: [
      { type: 'text', value: 'Quand un VA cree un nouveau compte Twitter, il faut une periode de warm-up de 4 jours MINIMUM. Si on skip le warm-up = shadowban garanti.' },
      { type: 'subtitle', value: 'Pendant le warm-up (Jours 1-4) :' },
      { type: 'steps', items: [
        'Poster 1-2 tweets par jour MAX (pas de liens !)',
        'Suivre 5-10 comptes par jour (pas plus)',
        'Liker 5-10 posts par jour',
        'NE PAS mettre de lien dans la bio',
        'NE PAS poster de liens dans les tweets',
        'Agir comme un vrai utilisateur qui decouvre Twitter'
      ]},
      { type: 'subtitle', value: 'Apres le warm-up (Jour 5+) :' },
      { type: 'steps', items: [
        'Augmenter a 3-5 tweets par jour progressivement',
        'Ajouter le lien dans la bio',
        'Commencer les reponses et interactions',
        'Poster des liens dans les tweets (avec moderation)',
        'Continuer a suivre des comptes (max 20/jour)'
      ]},
      { type: 'box', color: '#a78bfa', value: 'Le dashboard montre un badge WARM-UP sur les comptes de moins de 4 jours. Un compte en warm-up avec un lien bio = alerte rouge.' },
    ]
  },
  {
    title: 'Comment verifier le warm-up',
    color: '#06b6d4',
    content: [
      { type: 'subtitle', value: 'Checklist pour chaque VA apres 4 jours :' },
      { type: 'list', items: [
        'Le compte a poste pendant les 4 jours ? (pas 0 tweets)',
        'Le lien bio n\'a PAS ete ajoute avant jour 5 ?',
        'Le compte n\'est PAS shadowban ?',
        'Le VA a bien suivi des comptes ? (check followers/following)',
        'Les tweets sont naturels ? (pas de copier-coller)'
      ]},
      { type: 'subtitle', value: 'Signaux d\'alerte :' },
      { type: 'list', items: [
        'Compte en warm-up + lien bio = TROP TOT',
        'Compte en warm-up + 0 tweets = VA n\'a rien fait',
        'Compte en warm-up + shadowban = VA a ete trop agressif',
        'Compte post-warmup + 0 tweets = VA a abandonne',
        'Compte avec beaucoup de following mais 0 followers = spam follow'
      ]},
      { type: 'box', color: '#06b6d4', value: 'Regarde le ratio followers/following. Un compte sain a au moins 10% du ratio (ex: 100 following = au moins 10 followers). En dessous = probleme.' },
    ]
  },
  {
    title: 'Bonnes pratiques equipe',
    color: '#3b82f6',
    content: [
      { type: 'subtitle', value: 'Pour gerer ton equipe efficacement :' },
      { type: 'list', items: [
        'Lance !scan regulierement pour mettre a jour le CRM',
        'Verifie l\'onglet Equipe tous les jours',
        'Contacte les VAs "Inactifs" dans les 24h',
        'Les VAs "Sans reponse" > 3 jours = relancer ou remplacer',
        'Verifie les comptes en warm-up chaque jour',
        'Un VA avec beaucoup de shadowbans = mauvaises pratiques, former',
        'Compare les VAs entre eux pour identifier les meilleurs'
      ]},
      { type: 'subtitle', value: 'Workflow recommande :' },
      { type: 'steps', items: [
        'Matin : Check onglet Equipe, voir qui est actif',
        'Contacter les VAs inactifs via Discord (clic direct)',
        'Verifier les comptes en warm-up (lien bio trop tot ?)',
        'Lancer un scan pour mettre a jour les statuts',
        'Soir : Revoir les resultats, noter les problemes'
      ]},
    ]
  }
];

function Section({ section, isOpen, onToggle }) {
  return (
    <div style={{ background: '#111114', borderRadius: 12, border: '1px solid #1e1e22', borderLeft: `3px solid ${section.color}`, overflow: 'hidden' }}>
      <button
        onClick={onToggle}
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          width: '100%', padding: '16px 20px',
          background: 'transparent', border: 'none', color: '#e4e4e7',
          cursor: 'pointer', fontSize: '0.95rem', fontWeight: 700
        }}
      >
        <span>{section.title}</span>
        <span style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s', fontSize: '0.7rem' }}>&#9654;</span>
      </button>
      {isOpen && (
        <div style={{ padding: '0 20px 20px' }}>
          {section.content.map((block, i) => {
            if (block.type === 'text') return <p key={i} style={{ color: '#a1a1aa', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: 12 }}>{block.value}</p>;
            if (block.type === 'subtitle') return <h4 key={i} style={{ color: '#e4e4e7', fontSize: '0.85rem', fontWeight: 700, marginTop: 16, marginBottom: 8 }}>{block.value}</h4>;
            if (block.type === 'list') return (
              <ul key={i} style={{ margin: '0 0 12px 0', paddingLeft: 20 }}>
                {block.items.map((item, j) => (
                  <li key={j} style={{ color: '#a1a1aa', fontSize: '0.8rem', lineHeight: 1.8 }}>{item}</li>
                ))}
              </ul>
            );
            if (block.type === 'steps') return (
              <ol key={i} style={{ margin: '0 0 12px 0', paddingLeft: 20 }}>
                {block.items.map((item, j) => (
                  <li key={j} style={{ color: '#a1a1aa', fontSize: '0.8rem', lineHeight: 1.8 }}>
                    <strong style={{ color: '#e4e4e7' }}>{item.split(' - ')[0]}</strong>
                    {item.includes(' - ') ? ` - ${item.split(' - ').slice(1).join(' - ')}` : ''}
                  </li>
                ))}
              </ol>
            );
            if (block.type === 'box') return (
              <div key={i} style={{
                background: `${block.color}15`, border: `1px solid ${block.color}40`,
                borderRadius: 8, padding: '12px 16px', marginTop: 12,
                color: block.color, fontSize: '0.8rem', fontWeight: 600
              }}>
                {block.value}
              </div>
            );
            return null;
          })}
        </div>
      )}
    </div>
  );
}

function GuidePage() {
  const [openSections, setOpenSections] = useState({ 0: true });

  const toggle = (i) => setOpenSections(prev => ({ ...prev, [i]: !prev[i] }));

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 700, marginBottom: 4 }}>Guide Kyce</h2>
        <p style={{ color: '#71717a', fontSize: '0.85rem' }}>Tout ce que tu dois savoir pour gerer ton equipe de VAs</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sections.map((section, i) => (
          <Section key={i} section={section} isOpen={!!openSections[i]} onToggle={() => toggle(i)} />
        ))}
      </div>
    </div>
  );
}

export default GuidePage;
