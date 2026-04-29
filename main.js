import { Actor } from 'apify';
import { ApifyClient } from 'apify-client';
import ExcelJS from 'exceljs';
import fs from 'fs';

// ─────────────────────────────────────────────────────────────
//  CONFIG
// ─────────────────────────────────────────────────────────────
const CONFIG = {
    HASHTAGS: [
        'botola', 'wydad', 'rajacasablanca', 'equipedumaroc',
        'footballmaroc', 'wydadcasablanca', 'rcaofficiel',
        'mafootball', 'atlaslions', 'botolama',
        'supportermaroc', 'footballmarocain', 'dima_wydad',
        'dimaraja', 'maghribkoora'
    ],
    MIN_FOLLOWERS: 8000,
    MAX_FOLLOWERS: 350000,
    MIN_POSTS: 50,
    MAX_DAYS_INACTIVE: 45,
    FOOTBALLER_KEYWORDS: [
        'professional football player', 'joueur professionnel',
        'footballer', 'football player', 'joueur de football',
        'plays as', 'plays for', 'player at', 'joueur à',
        'joueur du', 'pro player', 'professional player',
        '@rcaofficiel', '@wacofficiel', '@equipedumaroc'
    ],
    GOOD_PAGE_KEYWORDS: [
        'page', 'fan', 'news', 'content', 'média', 'media',
        'créateur', 'creator', 'actualité', 'akbar', 'أخبار',
        'supporter', 'official', 'officiel', 'academy', 'club',
        'sport', 'koora', 'كرة', 'collaboration', 'collab',
        'business', 'partnership', 'dm for', 'contact'
    ]
};

// ─────────────────────────────────────────────────────────────
//  QUALIFICATION LOGIC
// ─────────────────────────────────────────────────────────────
function isProfessionalFootballer(profile) {
    const bio = (profile.biography || profile.bio || '').toLowerCase();

    for (const keyword of CONFIG.FOOTBALLER_KEYWORDS) {
        if (bio.includes(keyword.toLowerCase())) return true;
    }

    if (profile.verified && (profile.postsCount || profile.mediaCount || 0) < 100) {
        return true;
    }

    return false;
}

function isActive(profile) {
    const posts = profile.postsCount || profile.mediaCount || 0;
    if (posts < CONFIG.MIN_POSTS) return false;

    if (profile.latestPostDate || profile.lastPostDate) {
        const lastPost = new Date(profile.latestPostDate || profile.lastPostDate);
        const daysSince = (Date.now() - lastPost.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince > CONFIG.MAX_DAYS_INACTIVE) return false;
    }

    return true;
}

function calculateEngagementRate(profile) {
    const followers = profile.followersCount || profile.followers || 0;
    if (!followers) return 0;

    if (profile.latestPosts && profile.latestPosts.length > 0) {
        const posts = profile.latestPosts.slice(0, 12);
        const totalEngagement = posts.reduce((sum, post) => {
            return sum + (post.likesCount || 0) + (post.commentsCount || 0);
        }, 0);
        const avgEngagement = totalEngagement / posts.length;
        return ((avgEngagement / followers) * 100).toFixed(2);
    }

    return 'N/A';
}

function getTier(followers) {
