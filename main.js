import { Actor } from 'apify';
import { ApifyClient } from 'apify-client';
import ExcelJS from 'exceljs';
import fs from 'fs';

const CONFIG = {
    HASHTAGS: [
        // Botola specific
        'botola', 'botolama', 'botola2', 'botola1',
        'botolapro', 'botolainwi', 'botolamaroc',
        'botola2425', 'botola2526', 'botola24',
        'botola25', 'botolaproligue1',

        // Wydad fans
        'wydad', 'wydad37', 'wydadfans', 'wydadcasablanca',
        'dima_wydad', 'wydad_stoory', 'wydadnews',
        'wydadac', 'wydadathletic', 'wydadcup',
        'wacasablanca', 'wacofficiel', 'wydad_winners',
        'wydadboy', 'wydadgirl', 'wydadforever',
        'wydad_ultras', 'ultras_wydad',

        // Raja fans
        'rajacasablanca', 'dimaraja', 'raja1949',
        'rajafans', 'rcamaroc', 'rajaofficiel',
        'raja_ca', 'rajaclub', 'rajacasa',
        'ultrasraja', 'raja_ultras', 'greenboys',
        'rajaforever', 'rajanews', 'rajafamily',

        // Other Botola clubs
        'farcasablanca', 'ircasablanca', 'ittihad_tanger',
        'hassania_agadir', 'chabab_mohamedia',
        'kawkab_marrakech', 'mouloudia_oujda',
        'olympic_safi', 'renaissance_berkane',
        'rapide_oued_zem', 'difaa_hassani',
        'maghrib_fes', 'moghreb_athletic',
        'masts_tanger', 'nahda_berkane',
        'youssoufia_berrechid',

        // Moroccan national team
        'equipedumaroc', 'atlaslions', 'atlaslionsfans',
        'maroc2030', 'coupe_du_monde_maroc',
        'worldcup2030maroc', 'atlaslionstv',
        'teammaroc', 'morocconationalteam',
        'walid_regragui', 'regragui',

        // General Moroccan football
        'footballmaroc', 'footballmarocain',
        'mafootball', 'marocfoot', 'koramaroc',
        'moroccanfootball', 'supportermaroc',
        'maghribkoora', 'lkoora', 'kora_maroc',
        'actu_foot_maroc', 'footmaroc',
        'morocsport', 'sportmaroc',
        'marocfootball2025', 'marocfootball2026',

        // African football Moroccan angle
        'cafchampionsleague', 'cafcc', 'cafonline',
        'africafootball', 'africancup',

        // Moroccan sports general
        'sportmaroc', 'marocsport', 'sportnewsmaroc',
        'actu_sport_maroc', 'morocsports',

        // Content creators football niche
        'footballtiktokmaroc', 'footballreelsmaroc',
        'footballcontentmaroc', 'footcontentmaroc',
        'marocfootcontent', 'footballanalysemaroc',

        // Fan culture
        'ultrasmaroc', 'supportersmaroc',
        'tribunes_maroc', 'ambiance_stade_maroc',
        'stademaroc', 'marocstade',

        // Streaming/TV adjacent
        'beinsportsmaroc', 'arryadia_fans',
        'snrtmaroc', 'medi1sport',
        'matchmaroc', 'directsportmaroc',
        'streamingmaroc', 'matchdirect'
    ],

    MIN_FOLLOWERS: 1000,
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
    if (!followers) return 'N/A';
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
    if (followers < 5000) return 'MICRO';
    if (followers < 20000) return 'PRACTICE';
    if (followers < 50000) return 'MID';
    if (followers < 100000) return 'GOOD';
    return 'PRIORITY';
}

function qualifyProfile(profile) {
    const followers = profile.followersCount || profile.followers || 0;
    if (followers < CONFIG.MIN_FOLLOWERS || followers > CONFIG.MAX_FOLLOWERS) return false;
    if (isProfessionalFootballer(profile)) return false;
    if (!isActive(profile)) return false;
    if (profile.isPrivate || profile.private) return false;
    return true;
}

function safeDate(profile) {
    try {
        const ts = profile.latestPosts?.[0]?.timestamp;
        if (!ts) return '';
        const d = new Date(typeof ts === 'number' ? ts * 1000 : ts);
        return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
    } catch {
        return '';
    }
}

async function discoverUsernamesFromHashtag(client, hashtag) {
    console.log(`🔍 Discovering profiles from hashtag: #${hashtag}`);
    try {
        const run = await client.actor('apify/instagram-hashtag-scraper').call({
            hashtags: [hashtag],
            resultsLimit: 300,
            proxy: { useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'] }
        });
        const { items } = await client.dataset(run.defaultDatasetId).listItems();
        const usernames = [...new Set(
            items
                .map(item => item.ownerUsername || item.username || item.owner?.username)
                .filter(Boolean)
        )];
        console.log(`  ✅ Found ${usernames.length} unique usernames`);
        return usernames;
    } catch (err) {
        console.log(`  ⚠️ Hashtag ${hashtag} failed: ${err.message}`);
        return [];
    }
}

async function scrapeProfiles(client, usernames) {
    if (!usernames.length) return [];
    console.log(`📊 Scraping ${usernames.length} profiles...`);
    try {
        const run = await client.actor('apify/instagram-profile-scraper').call({
            usernames,
            proxy: { useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'] }
        });
        const { items } = await client.dataset(run.defaultDatasetId).listItems();
        console.log(`  ✅ Scraped ${items.length} profiles`);
        return items;
    } catch (err) {
        console.log(`  ⚠️ Profile scrape failed: ${err.message}`);
        return [];
    }
}

async function generateExcel(qualifiedLeads) {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Affiliate Leads');

    const headerStyle = {
        font: { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' }, size: 11 },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1a1a2e' } },
        alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
        border: {
            top: { style: 'thin', color: { argb: 'FF333355' } },
            bottom: { style: 'thin', color: { argb: 'FF333355' } },
            left: { style: 'thin', color: { argb: 'FF333355' } },
            right: { style: 'thin', color: { argb: 'FF333355' } }
        }
    };

    const tierColors = {
        MICRO:    { bg: 'FF3d2b6b', fg: 'FFc8a8f0' },
        PRACTICE: { bg: 'FF2d4a6b', fg: 'FFa8c8f0' },
        MID:      { bg: 'FF1a5c38', fg: 'FFa8f0c8' },
        GOOD:     { bg: 'FF5c3d1a', fg: 'FFf0d8a8' },
        PRIORITY: { bg: 'FF5c1a1a', fg: 'FFf0a8a8' }
    };

    ws.columns = [
        { header: '#',               key: 'num',        width: 5  },
        { header: 'Tier',            key: 'tier',       width: 10 },
        { header: 'Username',        key: 'username',   width: 25 },
        { header: 'Full Name',       key: 'fullName',   width: 28 },
        { header: 'Followers',       key: 'followers',  width: 12 },
        { header: 'Posts',           key: 'posts',      width: 8  },
        { header: 'Engagement Rate', key: 'engagement', width: 16 },
        { header: 'Category',        key: 'category',   width: 20 },
        { header: 'Bio',             key: 'bio',        width: 45 },
        { header: 'Latest Post',     key: 'latestPost', width: 14 },
        { header: 'DM Link',         key: 'dmLink',     width: 38 },
        { header: 'Status',          key: 'status',     width: 14 },
        { header: 'DM Script',       key: 'dmScript',   width: 80 }
    ];

    ws.getRow(1).height = 32;
    ws.getRow(1).eachCell(cell => { Object.assign(cell, headerStyle); });

    qualifiedLeads.forEach((lead, idx) => {
        const tier = getTier(lead.followers);
        const colors = tierColors[tier];
        const engRate = calculateEngagementRate(lead.rawProfile);

        const dmScript = lead.followers < 10000
            ? `سلام خويا 👋 تبارك الله عليك، المحتوى ديالك زوين والجمهور عندك متفاعل بزاف. عندي ليك واحد الاقتراح: تبارطاجي ستوري لخدمة Streaming ديالنا، وكل واحد شرا من عندك كتوصلك 30 درهم فالبلاصة. بلا عقد، بلا التزام، وقتما بغيتي تحبس كتحبس. نصيفط ليك Trial مجاني ديال 24 ساعة تجرّب الخدمة وتشوف الجودة بنفسك؟`
            : `سلام خويا 👋 تبارك الله عليك، الجمهور اللي عندك عندو قيمة كبيرة وبغينا نتعاونو معاك. حنا براند Vizion Maroc، خدمة Streaming مغربية. الاقتراح هو: كل بيعة من الرابط ديالك كتوصلك فيها 30 درهم فالحين. وإلا كنتي كتفضل Collab مدفوع (ثمن ثابت للستوري)، حنا مستعدين نهضرو فهاد القضية. نصيفط ليك Trial ديال 24 ساعة تشوف الجودة وتعرف علاش كنهضرو؟`;

        const row = ws.addRow({
            num:        idx + 1,
            tier,
            username:   lead.username,
            fullName:   lead.fullName || '',
            followers:  lead.followers,
            posts:      lead.posts,
            engagement: engRate === 'N/A' ? 'N/A' : `${engRate}%`,
            category:   lead.category || '',
            bio:        lead.bio || '',
            latestPost: lead.latestPost || '',
            dmLink:     `https://ig.me/m/${lead.username.replace('@', '')}`,
            status:     'TO CONTACT',
            dmScript
        });

        row.height = 100;
        row.eachCell((cell, colNum) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.bg } };
            cell.font = { name: 'Arial', color: { argb: colors.fg }, size: 10 };
            cell.border = headerStyle.border;
            cell.alignment = {
                horizontal: colNum === 13 ? 'right' : 'center',
                vertical: 'top',
                wrapText: true
            };
        });
    });

    const statsWs = wb.addWorksheet('Stats');
    statsWs.columns = [
        { header: 'Metric', key: 'metric', width: 30 },
        { header: 'Value',  key: 'value',  width: 15 }
    ];

    const tierCounts = { MICRO: 0, PRACTICE: 0, MID: 0, GOOD: 0, PRIORITY: 0 };
    qualifiedLeads.forEach(l => tierCounts[getTier(l.followers)]++);

    [
        { metric: 'Total Qualified Leads',  value: qualifiedLeads.length },
        { metric: 'MICRO (1K-5K)',           value: tierCounts.MICRO },
        { metric: 'PRACTICE (5K-20K)',       value: tierCounts.PRACTICE },
        { metric: 'MID (20K-50K)',           value: tierCounts.MID },
        { metric: 'GOOD (50K-100K)',         value: tierCounts.GOOD },
        { metric: 'PRIORITY (100K-350K)',    value: tierCounts.PRIORITY },
        { metric: 'Hashtags Searched',       value: CONFIG.HASHTAGS.length },
    ].forEach(s => statsWs.addRow(s));

    const path = '/tmp/vizionmaroc_affiliate_leads.xlsx';
    await wb.xlsx.writeFile(path);
    console.log(`📁 Excel saved: ${path}`);
    return path;
}

Actor.main(async () => {
    const input = await Actor.getInput();
    const apiToken = input?.apifyApiToken || process.env.APIFY_TOKEN;

    if (!apiToken) {
        throw new Error('❌ No Apify API token provided. Add it in input as "apifyApiToken".');
    }

    const client = new ApifyClient({ token: apiToken });

    console.log('🚀 VizionMaroc Affiliate Scraper — Botola Edition');
    console.log(`📋 Searching ${CONFIG.HASHTAGS.length} hashtags`);

    const allUsernames = new Set();
    for (const hashtag of CONFIG.HASHTAGS) {
        const usernames = await discoverUsernamesFromHashtag(client, hashtag);
        usernames.forEach(u => allUsernames.add(u));
        await new Promise(r => setTimeout(r, 2000));
    }

    console.log(`\n📌 Total unique usernames discovered: ${allUsernames.size}`);

    const usernameArray = [...allUsernames];
    const batchSize = 50;
    let allProfiles = [];

    for (let i = 0; i < usernameArray.length; i += batchSize) {
        const batch = usernameArray.slice(i, i + batchSize);
        const profiles = await scrapeProfiles(client, batch);
        allProfiles = allProfiles.concat(profiles);
        if (i + batchSize < usernameArray.length) {
            await new Promise(r => setTimeout(r, 3000));
        }
    }

    console.log(`\n🔬 Qualifying ${allProfiles.length} profiles...`);

    const qualifiedLeads = [];
    const seen = new Set();

    for (const profile of allProfiles) {
        const username = profile.username || profile.userName;
        if (!username || seen.has(username)) continue;
        seen.add(username);
        if (!qualifyProfile(profile)) continue;

        qualifiedLeads.push({
            username:   `@${username}`,
            fullName:   profile.fullName || profile.full_name || '',
            followers:  profile.followersCount || profile.followers || 0,
            posts:      profile.postsCount || profile.mediaCount || 0,
            bio:        profile.biography || profile.bio || '',
            category:   profile.businessCategoryName || profile.category || '',
            latestPost: safeDate(profile),
            rawProfile: profile
        });
    }

    qualifiedLeads.sort((a, b) => b.followers - a.followers);
    console.log(`\n✅ Qualified leads: ${qualifiedLeads.length}`);

    const excelPath = await generateExcel(qualifiedLeads);

    await Actor.setValue('OUTPUT_EXCEL', fs.readFileSync(excelPath), {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    await Actor.pushData(qualifiedLeads.map(l => ({
        username:       l.username,
        fullName:       l.fullName,
        followers:      l.followers,
        posts:          l.posts,
        engagementRate: calculateEngagementRate(l.rawProfile),
        bio:            l.bio,
        category:       l.category,
        latestPost:     l.latestPost,
        tier:           getTier(l.followers),
        dmLink:         `https://ig.me/m/${l.username.replace('@', '')}`,
        status:         'TO CONTACT'
    })));

    console.log('\n🎉 Done! Download from Storage → Key-value store → affiliates');
});
