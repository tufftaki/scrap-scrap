{
    "actorSpecification": 1,
    "name": "vizionmaroc-affiliate-scraper",
    "title": "VizionMaroc Affiliate Lead Scraper",
    "description": "Discovers and qualifies Moroccan Instagram football pages as IPTV affiliate candidates. Searches hashtags, scrapes profiles, filters out professional footballers and inactive accounts, outputs qualified leads with personalized DM scripts.",
    "version": "1.0",
    "input": {
        "title": "Scraper Configuration",
        "type": "object",
        "schemaVersion": 1,
        "properties": {
            "apifyApiToken": {
                "title": "Apify API Token",
                "type": "string",
                "description": "Your Apify API token from apify.com/account/integrations",
                "editor": "textfield",
                "isSecret": true
            },
            "minFollowers": {
                "title": "Minimum Followers",
                "type": "integer",
                "description": "Minimum follower count to qualify a page",
                "default": 8000
            },
            "maxFollowers": {
                "title": "Maximum Followers",
                "type": "integer",
                "description": "Maximum follower count to qualify a page",
                "default": 350000
            },
            "maxDaysInactive": {
                "title": "Max Days Inactive",
                "type": "integer",
                "description": "Skip pages that haven't posted in this many days",
                "default": 45
            },
            "customHashtags": {
                "title": "Custom Hashtags (optional)",
                "type": "array",
                "description": "Add extra hashtags to search. Leave empty to use defaults.",
                "editor": "stringList"
            }
        },
        "required": ["apifyApiToken"]
    }
}
