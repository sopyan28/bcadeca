-- Local/dev seed data, ported from the bca-deca-site.dc.html prototype.
-- Real member profiles are created by real signups (auth.users -> handle_new_user trigger),
-- not seeded here -- this file only seeds content that has no "owner" user: the question
-- bank, shop catalog, blazer inventory, and starter announcements.

-- ============================================================================
-- Question bank (ported verbatim from this.QB in the prototype, ~line 210-229)
-- ============================================================================
insert into public.questions (question_text, choices, correct_index, explanation, kpi_area, cluster, difficulty_rating) values
('A balance sheet shows a company''s financial condition by listing what it owns, owes, and its net worth — as of', array['A full fiscal year','A specific point in time','The next quarter','A 5-year average'], 1, 'A balance sheet is a snapshot at one moment; the income statement covers a period.', 'Financial Analysis', 'Finance', 1500),
('Revenue is $850,000, COGS is $510,000, operating expenses are $180,000. Net profit is', array['$160,000','$340,000','$180,000','$670,000'], 0, '$850k − $510k = $340k gross; $340k − $180k = $160k net.', 'Financial Analysis', 'Finance', 1550),
('Reviewing each income-statement line item as a percentage of total revenue is', array['Horizontal analysis','Vertical analysis','SWOT analysis','Break-even analysis'], 1, 'Vertical analysis expresses each item as a proportion of revenue.', 'Financial Analysis', 'Finance', 1500),
('Penetration pricing — a low launch price to grab market share — is used during which product life-cycle stage?', array['Growth','Maturity','Introduction','Decline'], 2, 'Low introductory pricing drives rapid adoption at launch.', 'Pricing', 'Marketing', 1450),
('A software firm sells its word processor, spreadsheet, and slides together for less than buying each. This is', array['Price skimming','Penetration pricing','Product bundling','Loss-leader pricing'], 2, 'Bundling packages multiple products at a combined discount.', 'Pricing', 'Marketing', 1500),
('Segmenting a sports-drink market into casual exercisers, athletes, and weekend warriors is', array['Demographic','Geographic','Psychographic','Behavioral'], 3, 'Behavioral segmentation divides by usage and behavior patterns.', 'Market Planning', 'Marketing', 1550),
('A situational analysis in a marketing plan primarily identifies', array['The promotional budget','Strengths, weaknesses, opportunities, threats','Channel partners','Sales forecasts'], 1, 'Situational analysis is essentially a SWOT of the firm''s position.', 'Market Planning', 'Marketing', 1450),
('The most common distribution channel for consumer goods is', array['Producer→agent→consumer','Producer→wholesaler→retailer→consumer','Retailer→wholesaler→producer','Producer→retailer→agent'], 1, 'Producer → wholesaler → retailer → consumer is the standard path.', 'Channel Management', 'Marketing', 1450),
('The primary goal of institutional (corporate) promotion is to', array['Sell a specific product','Build a favorable company image','Explain a service''s features','Respond to bad press'], 1, 'Institutional promotion builds image and goodwill, not a single sale.', 'Promotion', 'Marketing', 1500),
('Mirroring a client''s communication pace and tone to make them comfortable is', array['Deceptive communication','Building rapport','Passive-aggression','Aggressive style'], 1, 'Matching style builds rapport and trust.', 'Communication Skills', 'Business Management', 1400),
('Working capital management focuses primarily on', array['Long-term equity','Short-term assets and liabilities','Issuing stock','Acquisitions'], 1, 'It manages current assets/liabilities — cash, receivables, payables, inventory.', 'Financial Analysis', 'Finance', 1550),
('A company''s roof collapses in a storm, halting operations for weeks. This is', array['Financial risk','Strategic risk','Operational risk','Legal risk'], 2, 'Operational risk threatens day-to-day activities.', 'Risk Management', 'Business Management', 1450),
('Trading securities on material non-public information is', array['Affinity fraud','Insider trading','Phishing','A pump and dump'], 1, 'Insider trading uses confidential, market-moving information.', 'Business Law', 'Business Management', 1400),
('When an economy enters expansion, businesses typically', array['Cut inventory','Reduce capital investment','Invest in plants & equipment','Slash prices'], 2, 'Producer confidence rises, driving investment in capacity.', 'Economics', 'Entrepreneurship', 1500),
('A government restricting imports to protect domestic industry is practicing', array['Free trade','Protectionism','Arbitration','Monetary policy'], 1, 'Protectionism uses tariffs and quotas to shield domestic firms.', 'Economics', 'Entrepreneurship', 1450),
('Separation of duties — so no one person both authorizes and records a transaction — is a(n)', array['External control','Regulatory control','Internal control','Market control'], 2, 'It''s an internal control that reduces fraud risk.', 'Operations', 'Business Management', 1550),
('Future value of money requires three inputs:', array['Revenue, expenses, margin','Present value, interest rate, time','Net income, dividends, equity','Price, book value, yield'], 1, 'FV = PV × (1+i)^n needs PV, rate, and periods.', 'Financial Analysis', 'Finance', 1600),
('An employee who takes on extra work to help a teammate without being asked shows', array['Conformity','Initiative','Herd mentality','Passivity'], 1, 'Initiative is acting proactively without being told.', 'Emotional Intelligence', 'Hospitality & Tourism', 1400);

-- ============================================================================
-- Shop catalog (ported verbatim from this.SHOP)
-- ============================================================================
insert into public.shop_items (id, name, icon, kind, slot, price, anim) values
('beanie', 'Beanie', '🧢', 'outfit', 'hat', 30, null),
('tophat', 'Top Hat', '🎩', 'outfit', 'hat', 45, null),
('crown', 'Gold Crown', '👑', 'outfit', 'hat', 90, null),
('grad', 'Grad Cap', '🎓', 'outfit', 'hat', 60, null),
('shades', 'Sunglasses', '🕶️', 'outfit', 'eyes', 35, null),
('scarfR', 'Red Scarf', '🧣', 'outfit', 'neck', 25, null),
('bowtie', 'Bow Tie', '🎀', 'outfit', 'neck', 40, null),
('briefcase', 'Briefcase', '💼', 'outfit', 'hand', 50, null),
('diamond', 'DECA Diamond', '💎', 'outfit', 'hand', 110, null),
('e-waddle', 'Waddle', '🐧', 'emote', 'emote', 55, 'pwaddle .55s ease-in-out infinite alternate'),
('e-party', 'Party', '🎉', 'emote', 'emote', 95, 'pparty .4s ease-in-out infinite alternate'),
('e-celebrate', 'Celebrate', '🥳', 'emote', 'emote', 130, 'pcelebrate .6s ease-in-out infinite'),
('e-star', 'Starpower', '⭐', 'emote', 'emote', 170, 'pstar .7s ease-in-out infinite');

insert into public.shop_items (id, name, icon, kind, slot, price, power_up_type, power_up_amount) values
('pu-hint', 'Hint Pack ×3', '💡', 'power', 'power', 40, 'hint', 3),
('pu-double', 'Double Points', '✖️2', 'power', 'power', 70, 'double', 1),
('pu-freeze', 'Streak Freeze', '❄️', 'power', 'power', 50, 'freeze', 1);

-- ============================================================================
-- Blazer inventory (ported from the borrowNode() blazers array)
-- ============================================================================
insert into public.blazer_inventory (size, count) values
('XS', 2), ('S', 5), ('M', 8), ('L', 6), ('XL', 3), ('XXL', 1);

-- ============================================================================
-- Starter announcement (the pinned room-assignments card + one fundraiser)
-- ============================================================================
insert into public.announcements (title, body, kind, pinned, room_assignments) values
('Wednesday Club Room Assignments', 'Weekly club room assignments by last name.', 'pinned', true,
  '{"A–I": "Room 179", "J–R": "Room 180", "S–Z": "Room 181"}'::jsonb);

insert into public.announcements (title, body, kind) values
('Spring Bakesale — Main Lobby', 'Fri Apr 17 · proceeds fund ICDC travel. Sign up to bring an item or staff a shift.', 'fundraiser'),
('Krispy Kreme Pre-Sale', 'Orders due Mar 6. $12/dozen, pickup before the State send-off.', 'fundraiser');
