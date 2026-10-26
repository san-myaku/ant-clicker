# ユーザー提供の蟻ゲーム前例調査（本文の書き起こし）

2026-10-27受領。原HTMLのCSS/JavaScriptを実行せず、本文と出典URLを抽出した。図表の配置は再現していない。これは提供された調査の転記で、個々の断定・引用・性能値をCodexが独立確認した記録ではない。

原HTMLのSHA256: bf25df9e82a2196b4d2814bd9fd424616a5569519b2d67ef8db3c84e8beb0621

評価と確認範囲は [前例調査の評価](../ANT_GAME_PRECEDENT_REVIEW.md)。

**L001** 蟻ゲーム前例調査

**L002** 調査日: 2026年10月27日（JST）／ 商業ゲーム7系統＋itch.io・Steam小規模作＋GitHub主要リポジトリ＋技術デモを調査

**L003** 蟻のゲームは、みんなどうしているのか

**L004** 「ありクリッカー」（横視点の巣断面、1粒ずつ掘る、土粒・卵・餌はすべて実物の物理物体、決定性、単一スレッドのスマホ、止まりを隠さない）と同じ問題に、既存の蟻ゲームやシミュレーションがどう向き合ってきたか——あるいはどう回避してきたか——を、出典付きで調べた結果です。

**L005** 結論

**L006** 「個体を本当に物理で運ばせ、巣を粒単位で掘る横視点ゲーム」は、調査範囲に存在しませんでした。

**L007** 最も細かい商業作でもヘックス／タイル1枚単位が最小粒度です。粒に最も近い前例は、研究系オープンソースの Indy9000/ant-sim（砂粒2×2pxを個体が運ぶ）と、土のブロックを運び出させる AntQueen 3D の2つだけでした。横視点×粒単位掘削×個体の物理運搬の三点セットは、本作だけの組み合わせです。

**L008** 目次

**L009** 要旨

**L010** Empires of the Undergrowth

**L011** Pocket Ants

**L012** SimAnt（1991）

**L013** Ant War / Ant Nation

**L014** The Ants: Underground Kingdom

**L015** Ant Legion

**L016** 小規模作・開発中作

**L017** GitHub / オープンソース

**L018** フェロモン方式とACO

**L019** 群衆・フローフィールド・性能研究

**L020** 横視点の系譜（比較表）

**L021** 比較まとめ：取り入れる／使えない／独自

**L022** 確認できなかったこと

**L023** 要旨

**L024** 「1粒ずつ掘る」商業ゲームは見つからなかった。最も細かい商業作でも Empires of the Undergrowth（EotU）と開発中の Antopolis のヘックス／タイル1枚単位が最小粒度。土は「掘削対象タイル」として消え、土粒が実体として運び出される仕様は出典に現れない。

**L025** 個体数の公称値と実体の乖離が常態。EotUの本拠人口上限は100→最大300、Pocket Antsは最大232匹。一方 The Ants の「巣1つ最大55,000匹×7巣」は兵隊の数値であり個体シミュレーションではない。Ant War（2003）の目標は「10億匹」で、毎日「何匹を採餌／掘削／孵化／防衛に回すか」の数値配分だけ。

**L026** 渋滞は「解く」のではなく「起きない設計」にするのが主流。EotUは巣入口で地上⇔地下をテレポートさせ、フェロモンマーカーへの応答を「群れが多いほど遅く」し、巣内タイルに速度ペナルティ／ハイウェイタイルに速度ボーナスを付けて通路作りを誘導する。Pocket Antsや The Ants 系は巣の構造自体が固定通路＋完成形の部屋で、渋滞の発生余地を最初から潰している。

**L027** 「止まりを隠す」手法は前例の常套手段で、本作の方針と正面から衝突する。SimAntのマニュアルは看護について「画面上では幼虫を運ぶ姿は見せないが、計算の中では処理している」と明言。Pocket Antsはログアウト10分後からワーカーがオフライン採集する。モバイル4X系は数日単位の建設タイマー＋短縮アイテムで時間を飛ばす。

**L028** 性能の定説は「経路探索と衝突がボトルネックで、描画ではない」。EotU開発者はUE4の標準アクター移動・衝突は「数百匹規模のRTSに最適化されていない」として移動・経路探索を自作に全面書き換えた。研究用Unity VRシミュレーション Neozoa でも「フレームレートは描画ではなくロジック処理と衝突検出で律速」と明記され、4,000匹/25fps、快適動作は約1,000匹が目安だった。

**L029** 300匹EotU 本拠の人口上限（開始時100、章の進行で拡大）

**L030** 232匹Pocket Ants の最大個体数（うちワーカー上限150）

**L031** 55,000匹／巣The Ants の収容数。ただし個体ではなく数値

**L032** 500匹／コロニーtulustul/ants-sandbox の上限デフォルト（ブラウザ実装）

**L033** 4,000匹 / 25fpsNeozoa（Unity VR研究）。快適動作の目安は約1,000匹

**L034** 2×2pxIndy9000/ant-sim の砂粒サイズ。粒を運ぶ唯一級の前例

**L035** 1Empires of the Undergrowth

**L036** Slug Disco／PC・Mac／Unreal Engine 4／2017年アーリーアクセス → 2024年6月7日正式発売。調査した中で最も本作に近い商業作。

**L037** 視点: 地上・地下ともトップダウン

**L038** 掘削単位: ヘックスタイル

**L039** 人口上限 100 → 300

**L040** 巣と掘削

**L041** ヘックスグリッド。黒い未掘削エリアのタイルをクリックして掘削指定するとワーカーが掘る。1タイルを同時に掘れるのは最大2匹（巣入口タイルは最大7匹）。掘り当てた空洞（cavern）は「掘り込んだ瞬間に全体が即座に掘削済みになる」＝完成形で出現する部分もある。掘った後に育児・食料・ハイウェイ等の機能タイルを敷いて部屋にする。19タイルの六角形が最も効率の良い部屋形とされる。

**L042** 土粒を運び出す仕様は出典にない。掘削はタイル単位のジョブであり、粒単位ではない。

**L043** 出典: [source: https://empires-of-the-undergrowth.fandom.com/wiki/Basic_Mechanics] Basic Mechanics（Wiki）／ [source: https://store.steampowered.com/app/463530/Empires_of_the_Undergrowth/?l=norwegian&snr=1_430_4__431] Steamストアページ

**L044** アリの個体性

**L045** 1匹ずつ3Dモデル・体力・ステータスを持つユニットだが、個体への直接指示はできない（"You don't control individual ants"）。同じ部屋の個体が自動でコントロールグループになり、プレイヤーは最大5つのフェロモングループにマーカーを置いて群れ単位で誘導する。卵は1タイルに1つ、ワーカーが女王から空き育児タイルへ卵を運び、餌が足りなければ幼虫の成長は途中で止まる。

**L046** 最大個体数: 本拠フォーミカの人口上限は100から始まり、章の進行で125／150／175／300（公式Wiki）。ミッション内では「数百匹」規模の戦闘が売り文句だが、1000匹級の常時シミュレーションは公称していない。

**L047** 出典: [source: https://wiki.hoodedhorse.com/Empires_of_the_Undergrowth/index.php?title=Story_Mode&direction=prev&oldid=1802] 公式Wiki — Story Mode

**L048** 経路探索と渋滞対策

**L049** Wiki明記: 「The shortest path is always chosen」（最短路が常に選ばれる）。アルゴリズム名（A*等）は不明公開資料で確認できなかった。

**L050** 巣入口はテレポート: "Nest entrances teleport creatures between the surface and the respective underground areas" — 地上⇔地下の出入り渋滞を構造ごと消している。

**L051** 応答の間引き: "Responding speed becomes slower if you have a lot of ants in a single pheromone group" — 1グループの個体数が多いほどマーカーへの反応が遅くなる（開始タイミングの分散）。

**L052** 通路設計の誘導: ハイウェイタイル上は10〜25%速く、それ以外の巣内タイルでは50%遅くなる。プレイヤーが幹線を作る動機を速度で作っている。

**L053** 初期版の変更ログには「アリ同士がすり抜けなくなった／前線が物理的に通路を塞げる／常にお互いを迂回しようとする」等の衝突・回避の再設計が記録されている。

**L054** 出典: [source: https://empires-of-the-undergrowth.fandom.com/wiki/Basic_Mechanics] Basic Mechanics（Wiki）／ [source: https://slugdisco.com/empires-of-the-undergrowth-build-0-06-change-log/] Build 0.06 Change Log

**L055** 性能の工夫

**L056** 開発者自身の言葉が最も具体的。2019年6月ニュースレター:

**L057** "creature movement and collision detection code is dependent on default Unreal Engine 4 actor functions. These are not at all optimised for use in an RTS game that has potentially hundreds of moving, reacting creatures"

**L058** （移動と衝突検出がUE4標準のアクター関数に依存しており、数百匹規模のRTSには最適化されていない——これが「ゲームが重くなり始める主因」）

**L059** 該当コードを全面的に書き換える判断をし、副次効果として「stuck creatures（詰まった個体）対策アルゴリズムの除去」「より大きな軍勢が現実的に」なった。2020年1〜2月ニュースレターでは、数ヶ月かけて移動・経路探索を "built-in Unreal Engine 4 functions with bespoke ones" に置換したとし、「The primary motivation for all this work is optimisation」と明言。大量に湧くファイアアント実装の前提工事だった。

**L060** ほか、地下はナビメッシュが掘削のたびに再計算される必要があること、地上植物の登攀はスプラインを経路案内に使うことが開発者発信の裏側紹介にある。変更ログには「地下の経路探索改善（多くの距離判定をパスベースからタイルベースに）」という最適化も記録されている。

**L061** 出典: [source: https://slugdisco.com/june-2019-newsletter/] June 2019 Newsletter／ [source: https://store.steampowered.com/news/app/463530/view/3744117349098958772?l=swedish] Jan/Feb 2020 Newsletter（Steam）／ [source: https://tuxdb.com/game/3706&gamenews=1] 開発者発信の転載（tuxdb）／ [source: http://dogsofwarvu.com/forum/index.php?PHPSESSID=e5s447mgnr4d56dch5t8iihl1e&action=printpage;topic=5631.0] 変更ログ転載フォーラム

**L062** 保存・成長曲線

**L063** 成長の律速は (a) 育児タイル数＝人口上限そのもの、(b) 食料貯蔵タイルの容量（レベル別 10/40/100）、(c) 卵1つごとの食料コスト、の3点セット。女王が死ぬと敗北。フォーミカは章を跨いで存続する永続コロニーで、セーブはコロニー単位の .sav ファイルとして存在する（非公式セーブ編集ガイドが Colony*.sav の存在を示す）。ミッション中のセーブ可否・内部形式は不明。

**L064** 出典: [source: https://empires-of-the-undergrowth.fandom.com/wiki/Basic_Mechanics] Basic Mechanics（Wiki）／開発回顧: [source: https://www.gamedeveloper.com/design/postmortem-how-empires-of-the-undergrowth-came-together-in-over-7-years-of-early-access] Game Developer誌ポストモーテム（当初はモバイル向け Dungeon Keeper 風＋綱引き型で自作エンジン開発に1年以上を費やし、最終的にUE4を採用）

**L065** 2Pocket Ants: Colony Simulator

**L066** Ariel-Games／モバイル／2020年〜

**L067** 掘削: なし（固定レイアウト）

**L068** 最大 232匹

**L069** オフライン採集あり

**L070** 巣と掘削

**L071** 掘削そのものが存在しない。巣は "the hall" と呼ばれる長い通路1本＋そこからアクセスする部屋群という固定レイアウト。全9種の部屋のうち女王の間だけが最初から建っており、残りはプレイヤーアリが「Colony」メニューから建設する（完成形で出現するタイプ）。部屋は資源で最大Lv12まで強化。

**L072** 出典: [source: https://pocketants.fandom.com/wiki/Black_Ants] Black Ants（Wiki）／ [source: https://pocketants.fandom.com/wiki/Colony_Chambers] Colony Chambers（Wiki）／ [source: https://play.google.com/store/apps/details?id=com.ariel.zanyants&hl=en_CA] Google Play公式説明

**L073** アリの個体性

**L074** 個体は画面上に実在し、プレイヤーアリ1匹を直接操作する点はSimAntの系譜。ただし通常ワーカーへの指示は個体単位ではなく、Workersメニューのスライダーでタスク別人数を割り振る方式。最大個体数は232匹、うちワーカー上限150匹（Food Processing Chamber Lv12で決定）。女王は卵を1個ずつ産み、ワーカー卵＝菌1、兵隊卵＝菌15のコスト。

**L075** 経路探索と渋滞対策

**L076** 不明公開資料なし。ただし巣内は単一の幹線＋部屋という構造上、対面交通の問題が起きにくい設計であることはレイアウトから読み取れる（これは構造的事実であり、開発者発言ではない）。

**L077** 性能

**L078** 不明エンジン・最適化の公表情報なし。2Dピクセルアート、最大232匹という控えめな上限自体がモバイルでの性能担保策と解釈できるが、開発者の明言は確認できなかった。

**L079** 保存・成長曲線

**L080** 女王への給餌→産卵→タスク配分という律速に加え、決定的に本作と方針が違う点としてオフライン採集: "They can gather resources offline, starting 10 minutes after the player logs out"（ログアウト10分後からワーカーが採集を続ける）。「止まりを隠さない」本作とは逆の、放置を前提にした設計である。

**L081** 3SimAnt: The Electronic Ant Colony（1991）

**L082** Maxis／Will Wright・Justin McCormick。1992年 Codie賞 Best Simulation。E.O. Wilson『The Ants』が理論的源泉で、個体の単純な行動からコロニー全体の知能が創発する "emergence" が設計思想の中核。

**L083** 地下は横視点 — 本作と同じ視点のほぼ唯一の商業古典

**L084** 掘削単位: アリが進んだ経路分

**L085** 巣と掘削

**L086** 地上はトップダウン、地下は横視点（side view）。黄色アリ（プレイヤーの分身）は地下でカーソル位置まで掘り進んでトンネルを拡張できる。マニュアル（SNES版）: "While in the Nest Close-up view, if you move the cursor over some dirt and press the A button, the Yellow Ant will dig its way to the cursor"。ただし掘削は「アリが土中を進んだ経路が通路になる」方式で、土粒という物体は生成されず、運び出す工程もない。地形がグリッドか否かの実装詳細は不明（画面上はセル状の土表現）。

**L087** 出典: [source: https://dn720005.ca.archive.org/0/items/kirklands_manual_labor_-_super_nintendo_-_usa_-_2k_version/SimAnt%20-%20The%20Electronic%20Ant%20Colony%20%28USA%29_djvu.txt] SNES版マニュアル／ [source: https://en.wikipedia.org/wiki/SimAnt] Wikipedia

**L088** アリの個体性

**L089** 黄色アリ1匹を直接操作し、任意の個体と入れ替われる。他個体は、黄色アリが残すフェロモンの道（餌・危険・巣の3種の匂いを表示可能）と、Behavior（採餌／掘削／看護の比率）と Caste（ワーカー／兵隊／繁殖個体の出生比率）という2つのパーセンテージ配分で間接制御する。個体ごとに餌・小石・卵を拾って運ぶ描写は黄色アリとその周辺に限られる。

**L090** 最大個体数: 公式の上限値は不明。二次情報では繁殖個体が有用になるのが人口100前後とされ、規模感は数十〜百数十匹。

**L091** 隠蔽の明言

**L092** DOS版マニュアルの看護（Nursing）の項:

**L093** "In SimAnt, the nurses aren't shown on-screen carrying the brood around, but they are in the simulation calculations. If you don't assign enough of your work force to nursing, your eggs will not hatch..."

**L094** （幼虫の運搬は見せないが計算には入っている）

**L095** 公式マニュアル自身が「見せない計算」を明記している。本作の「隠さない」方針がどれほど異例かの証拠になる。

**L096** 出典: [source: https://oldgamesdownload.com/wp-content/uploads/manuals/simant-the-electronic-ant-colony_dos_manual_en_n8j.pdf] DOS版マニュアル

**L097** 経路探索と渋滞対策

**L098** 不明明示的な経路探索（A*等）の記述なし。フェロモンの匂い場＋ランダムな徘徊が移動の基盤で、雨はフェロモンを洗い流し巣の下部を浸水させる。通路の渋滞という概念自体が（個体がすり抜ける前提のため）設計対象になっていないとみられるが、断定できる出典はない。

**L099** 保存・成長曲線

**L100** 律速は「餌＝エネルギー」管理そのもの。餌をエネルギーに換え、より多くのエネルギーを得る個体へ投資する循環がマニュアルで明示される。カースト比率が出生を、行動比率が労働配分を決めるため、成長曲線は2つのスライダー（三角形メニュー）でほぼ決定される。実装は Wright と McCormick の2名が約半分ずつ、制作期間1年未満。

**L101** 4Ant War（2003）／ Ant Nation（2009）

**L102** 数値配分と群れ操作——個体シミュレーションを最初から持たない系譜。

**L103** Ant War（Anarchy Enterprises）

**L104** 毎日「何匹が餌を探し、何匹が新しいトンネルを掘り、何匹が孵化し、何匹が防衛するか」を決める純粋な数値配分ゲーム。"You start with a queen, a few worker ants... Each day you decide how many of your ants will look for food, dig new tunnels, hatch babies or defend the colony"。

**L105** 勝利条件は10億匹の蓄積。巣の空間表現・個体の移動・経路探索は存在しない（テキストと数値が主体とレビューも指摘）。掘削は「dig担当の人数×日数」で増える抽象量である。

**L106** 出典: [source: https://www.gamewatcher.com/mods/ant-war-mod/ant-war-demo] GameWatcher／ [source: https://www.mobygames.com/game/82541/ant-war/] MobyGames

**L107** Ant Nation（Konami、WiiWare / DS）

**L108** WiiWare版はサンドボックスで最大で数百匹の群れ（swarm of up to hundreds of ants）を操作、DS版は属性の三すくみでグループを作る方式。

**L109** レビューが伝える操作系が対照的で示唆的: ピペット道具でアリの集団を掴んで別の場所へ運べる（＝移動の省略・ワープ的再配置を道具として正当化）、巣から出すにはWiiリモコンを振ってアリを「振り出す」。

**L110** 巣の掘削・経路探索・性能の技術情報は不明。

**L111** 出典: [source: https://en.wikipedia.org/wiki/Ant_Nation] Wikipedia／ [source: http://www.nintendoworldreport.com/review/19524/ant-nation-wii] Nintendo World Reportレビュー

**L112** 5The Ants: Underground Kingdom

**L113** StarUnion／モバイル／2021年〜。断面の見た目を持ちながら、実体は数値とタイマーのオンラインゲーム。

**L114** 掘削単位: タイル領域解放

**L115** 55,000匹／巣 × 最大7巣（数値）

**L116** 巣と掘削

**L117** 見た目は横方向に広がる地下断面で、タップ／ドラッグで地面を「掘って」区画を広げ、空いた場所に施設を置く。チュートリアルの進行表には Tiles（タイル数）23→31→42→147→196→245 と区画拡大が数値で管理されることが示されており、掘削はタイル単位の領域解放である。

**L118** 決定的なのは配信説明文の一文:

**L119** "All buildings can be placed without any obstruction."

**L120** （建物は完成形で、障害なく置ける）

**L121** 土粒の運搬・掘削する個体の作業描写は出典にない。

**L122** 出典: [source: https://play.google.com/store/apps/details?id=com.allstarunion.ta.soe&hl=en_US] Google Play公式説明／ [source: https://the-ants-underground-kingdom.fandom.com/wiki/Tutorial] Tutorial（Wiki）／ [source: https://www.apkmirror.com/apk/starunion/the-ants-underground-kingdom/the-ants-underground-kingdom-3-37-2-release/the-ants-underground-kingdom-3-37-2-2-android-apk-download/] APKMirror掲載の配信説明

**L123** アリの個体性

**L124** 巣内に歩くアリの見た目はあるが、コロニーの実体は数値である。資源ガイドによれば巣（兵舎系施設）は最大7つ、各最大55,000匹収容。女王Lv22の昇格条件は "Population: 210000"、Lv25では資源数千万＋所要時間19日というタイマーとスピードアップ（短縮アイテム）が成長の実体である。行軍（march）も部隊単位の数値戦闘であり、個体ごとの経路探索・荷物運搬は少なくともゲームシステムとしては存在しない。

**L125** 出典: [source: https://www.bluestacks.com/blog/game-guides/the-ants/tauk-resources-guide-en.html] Resource Guide（BlueStacks）／ [source: https://simplegameguide.com/queen-level-upgrade-requirements/] Queen Level Upgrade Requirements

**L126** 経路探索・性能

**L127** 不明公表情報なし。数値とタイマーで進行するため、そもそもリアルタイム個体シミュレーションの性能問題を回避している典型例である。

**L128** 保存・成長曲線

**L129** サーバー型オンラインゲーム（同盟・PvP前提）であり、保存問題は「サーバーに状態を持つ」ことで消している。成長律速は資源の時間生産（施設あたり毎時○○単位）＋建設・進化キュー＋タイマー。レビューも "digging out tunnels and filling those spaces with resources" と、掘削が資源配置の前段であることを伝える。

**L130** 出典: [source: https://www.androidcentral.com/ants-underground-kingdom-android-game-week] Android Central紹介

**L131** 6Ant Legion: For The Swarm

**L132** 37GAMES系／モバイル4X。対比のための収録。

**L133** Google Play公式説明は "Build your own ant colony / Expand your colony and build up your base / Hatch giant ants and strengthen your legions / Battle over resources / Forge alliances" という4X（探索・拡張・開発・殲滅）の定型文であり、掘削や個体の運搬は一切うたわれていない。二次解説でも中核は「地下の巣に施設を置き、軍団を訓練し、マップで戦う」ことで、進行の律速は施設のアップグレードに必要な食料・水等の資源量である。技術詳細は不明。

**L134** 対比としての位置付け: The Ants と同様、「蟻の巣」という皮を被ったベースビルディング＋数値軍団ゲーであり、掘削・個体・渋滞の3問題をすべて設計から除外している。

**L135** 出典: [source: https://play.google.com/store/apps/details?id=com.global.antgame] Google Play公式説明／ [source: https://apkpure.net/ant-legion-for-the-swarm/com.global.antgamevn/amp] APKPure解説

**L136** 7小規模作・開発中作

**L137** 横視点／断面・1タイル掘削に近いところを狙った作品群。ここに本作へ一番近い2作がいる。

**L138** Antopolis: The Ant Colony Simulator（Steam、開発中）

**L139** EotU以後で最も本作に近い設計宣言を持つ新作。

**L140** "Carve your colony out of the earth one tile at a time, down through soft topsoil, stubborn clay and slow stone" — 1タイルずつ、地層で掘削速度が違う。部屋は10種。キー1つで地上と巣の断面（cutaway）表示を切替。

**L141** 個体性: "Watch nurses carry eggs and feed larvae by hand" — 看護アリが卵を運び幼虫に給餌する様子を見せると明記。SimAntが隠した部分を売りにしている点で本作に近い思想。

**L142** 採餌: "Foragers lay and follow pheromone trails, and routes that pay off get reinforced" フェロモン創発型。経路探索の実装は不明。

**L143** 個体数: "thousands of ants" は公称（マーケティング表現）であり実測値ではない。発売状態・エンジン・性能実測は不明（ページ内にロードマップと "in active development" の表記）。

**L144** 出典: [source: https://store.steampowered.com/app/4910350/] Steamページ

**L145** AntQueen 3D（Steam、3D）

**L146** 土を「運び出す対象物」にする稀な商業寄り前例。

**L147** レビュー: 卵にはカーストごとに食料と空間（space）が必要で、巣を掘り広げ続けることが必須。"digger" という掘削専門カーストが移動速度を落とさず土を取り除く。巣は完全3Dでほぼ任意形状。

**L148** 開発ログ: "When a Dig action has been commanded, some ground 'blocks' are created and the players needs to clean his colony if he wants to dig further" / "first set a zone where he would like ants to drop dirt blocks and the 'Cleaning' will start" — 掘る→土ブロックが実体として発生→捨て場を指定→ワーカーが運搬して片付ける→初めて先へ掘れるという工程分離は、本作の「土粒を運ぶ」設計に最も近い商業系事例。ただし粒度は粒ではなくブロック、視点は3D。

**L149** 出典: [source: https://saveorquit.com/2019/11/21/review-antqueen-3d/] Save or Quitレビュー／ [source: https://tuxdb.com/game/2316&gamenews=1] 開発ログ転載（tuxdb）

**L150** Ant Simulation 3D（モバイル、3D）

**L151** 地下に新しい部屋とトンネルを掘り、他のワーカーの支援で巣を拡大できると説明される一方、サンドボックスモードでは "create new chambers without digging phase" ＝掘削フェーズなしで部屋を即時作成できる。開始時のコロニー規模は12／25／50／100匹から選択。

**L152** 出典: [source: https://iphone.apkpure.com/app/ant-simulator-3d/com.mnhksdev.antsimulation] App紹介（APKPure）

**L153** itch.io の小規模作

**L154** ANT-POCALYPSE（shrinkray、ブラウザ）: itch.ioのタグ一覧に "Dig the nest, place the queen, then watch ..." とだけ現れる。掘削方式・個体数の詳細は不明。出典: [source: https://itch.io/games/code-epl] itch.ioタグ一覧

**L155** Anthill Empire 開発ログ: 部屋がLv5/10/15/20で側室を生やす際 "with no digging needed" と明記 — 小規模作でも「掘らない拡張」が選ばれている証拠。出典: [source: https://hatmat1.itch.io/anthill-empire/devlog/1728593/anthill-empire-devlog-the-big-update] 開発ログ

**L156** Colony Sim（Digital Scientist、ブラウザ＋Android APK）: 卵→幼虫→繭の段階が見える育児、食料の山が貯蔵量に応じて増える穀倉など「見える化」に寄せた作りだが、掘削方式の詳細は devlog の範囲では不明。出典: [source: https://digital-scientist.itch.io/colony-sim/devlog/1728369/v07-queens-orders-hunting-grounds-visible-brood-and-a-colony-that-lasts-the-winter] 開発ログ

**L157** Ant Colony Sim（コードは GitHub の NervesOfJello/Ants-AI）: 徘徊→発見→フェロモンの道形成という採餌シミュレーションで、巣の掘削はない。出典: [source: https://dababnehdesign.itch.io/ant-colony-simulation] itch.io

**L158** 8GitHub / オープンソース / 技術デモ — 個体ベース

**L159** スター数は2026年10月27日時点（SebLague／tulustul は実ブラウザで確認、それ以外は検索インデックス表示）。

**L160** リポジトリ／デモスター等言語／基盤方式の要点

**L161** [source: https://github.com/Indy9000/ant-sim] Indy9000/ant-sim★0、fork 1TypeScript→JS、ブラウザ砂粒が主役級の唯一の前例（下記）

**L162** [source: https://github.com/SebLague/Ant-Simulation] SebLague/Ant-Simulation★263、fork 31Unity 2021.3 / C#フェロモンフィールド2種で採餌。巣・掘削なし

**L163** [source: https://github.com/tulustul/ants-sandbox] tulustul/ants-sandbox★105、fork 8TypeScript / Vue3 / Pixi.jsブラウザ個体シミュ。コロニー上限デフォルト500

**L164** [source: https://github.saobby.my.eu.org/krple/colony-ant-simulator] krple/colony-ant-simulator不明Python 3推奨10〜100匹。フェロモン最短路の教材

**L165** [source: https://dan.andersen.name/projects/2015-01-04-gpu-ant-sim/] Dan Andersen GPU Ant ColonyデモC++/OpenGL GPGPU並列化前提のフェロモン採餌。掘削なし

**L166** Indy9000/ant-sim — 本作に最も近い「粒」の実装

**L167** "The simulation consisted of sand and ants as distinct situated objects that interacted with each other" — 砂とアリが対等な「置かれた物体」。

**L168** 寸法の明記がある: アリーナ660×660px、アリは10×2pxの矩形、砂粒は2×2px。アリは「体の形態（body morphology）を考慮して」砂や他個体との衝突を検出し、衝突で進路・速度・運搬中の物の扱い（落とすかどうか）が変わる。

**L169** 行動: Internal antは砂を巣の中心（brood）から外方向へ、External antは逆方向へ運ぶ。振る分けは巣中心から放射する静的なガウス分布フェロモン場への閾値反応＋相関ランダムウォークで、経路探索は持たない。各個体にエネルギーがあり、移動・引きずり・旋回で消費する。

**L170** 実装はTypeScriptでブラウザでそのまま動く。つまり「粒を物体として運ぶ」こと自体はHTML/JSでも成立する実証だが、規模（実験時の個体数）はREADMEに明記されず不明。餌・女王・成長・保存を持つ「ゲーム」ではない。

**L171** 出典: [source: https://github.com/Indy9000/ant-sim] GitHub／解説: [source: https://indy9000.blog/posts/modelling-ant-nest-construction.html] Modelling Ant Nest Construction

**L172** SebLague/Ant-Simulation

**L173** README: アリは餌（緑）を見つけて家へ運び、良い経路はフェロモンの跡（青＝家を出る方向、赤＝餌から戻る方向）で見つける。ユーザーは壁を描いて地形を変えられる。Unity Editor 2021.3用プロジェクト。掘削・巣・成長はなく、フェロモン場はグリッドに保持されるタイプの古典的センサー操舵（前方数点の濃度を読んで曲がる）。個体数の公称値は不明。

**L174** 出典: [source: https://github.com/SebLague/Ant-Simulation] GitHub

**L175** tulustul/ants-sandbox — 本作と同じ「ブラウザ＋TS」で個体を回す実例

**L176** スタック: Vue 3＋TypeScript＋Pixi.js（WebGL2優先。モバイルでもWebGL2を有効化する設定が解析されている）、状態はシリアライズ可能な構造＋localStorageで永続化（DeepWikiのCore解析）。

**L177** 規模のデフォルト値がコードから読み取れる数少ない例: 庭は5000×5000px、初期個体100匹／コロニー、コロニー上限500匹、デフォルト4コロニー（理論上最大2,000個体）。フェロモンは toFood／toHome／toEnemy の3種のフィールド（場）として保持。

**L178** 性能工夫として示唆的なのがパラメータ名で、ツアー用設定に antBrainTickTimeout や antGradientCheckTickTimeout のような思考・勾配チェックの間隔（tick間引き）を制御する値が現れる。個体の判断を毎tick全員分やらない設計が、ブラウザ実装の現実解として採用されている（値の意味の詳細は解析ページ依存のため、断定は避ける）。

**L179** 巣は持たない（地上の庭のみ）。掘削なし。

**L180** 出典: [source: https://github.com/tulustul/ants-sandbox] GitHub／ [source: https://deepwiki.com/tulustul/ants-sandbox/6.1-settings-and-configuration] DeepWiki設定解析

**L181** krple/colony-ant-simulator（Python）

**L182** 「theory（アーケード）／reality」2モード。realityではエネルギーを消費し、餌が足りれば新しいアリが生まれる。フェロモンで短い経路ほど強化され長い経路は蒸発して消える、という最短路創発の説明がREADMEの中核。引数 n_ants の推奨は10〜100匹（デフォルトも10〜100のランダム）— Python教材実装の規模感がそのまま出ている。

**L183** 出典: [source: https://github.saobby.my.eu.org/krple/colony-ant-simulator] GitHubミラー

**L184** GPU系デモ（Dan Andersen, Purdue 2014）

**L185** "ant colony simulation suitable for parallelization and GPGPU" という位置付けで、中心の巣からランダムに歩き、フェロモンを残し、餌を運び帰る。個体同士の相互作用が「即時近傍の知識」しか持たないため並列化できる、というのが論点であり、物理的な体・渋滞・掘削はモデルから外されているからこそGPUに乗る。

**L186** 出典: [source: https://dan.andersen.name/projects/2015-01-04-gpu-ant-sim/] プロジェクトページ

**L187** 9フェロモンベース採餌とACO — 「アリ」の意味が違う

**L188** ACO（Ant Colony Optimization）の「アリ」は個体ではない。巡回セールスマン問題等で、人工アリはグラフ上の解候補（ツアー）を1回のイテレーションで丸ごと構築し、経路長に反比例したフェロモンを辺に付ける。体も、移動時間も、衝突も、渋滞も存在しない。Sebastian Lagueの動画も前半はこのACO（TSP）を扱い、後半の「見えるアリのシミュレーション」とは別物として構成されている。出典: [source: https://cyberspaceandtime.com/CODING-ADVENTURE-ANT-AND-SLIME-SIMULATIONS-mtXyQ-OKiKmSrMQVaQKugRXOz0d2j1bQA.htm] Coding Adventure: Ant and Slime Simulations 紹介

**L189** 可視化型フェロモンシミュ（SebLague、tulustul、Pezzza系、krple等）の共通構造: (1) 環境側がフェロモン濃度をグリッド／フィールドとして保持し蒸発・拡散させる、(2) 個体は前方の数サンプル点の濃度差で操舵する、(3) 状態は「餌を探す／餌を持って帰る」の2〜3状態のステートマシン、(4) 荷物は「持っている」というフラグであり物理物体ではない、(5) 経路探索は存在せず、最短路は強化と蒸発の結果として創発する。渋滞はフェロモンのループ（ant mill）として現れることはあっても、体の衝突として扱われない。

**L190** 個体ベース移動との決定的な違い: 本作のように「目的地までの経路を個体が知っている／計算する」方式は、この系譜では少数派である。フェロモン方式は経路探索コストを環境側の場の更新に転嫁し、個体あたりO(数サンプル)で済ませる代わりに、(a) 確実に目的地へ着く保証がない、(b) 新しい部屋・新しい餌への即応性が低い、(c) 決定的再現には乱数管理が要る、という代償を払っている。

**L191** 10群衆・フローフィールド・性能研究

**L192** 純粋なboids（分離・整列・凝集）で蟻を扱う著名なゲーム／デモは、調査範囲では見つからなかった。蟻系デモの主流は一貫してフェロモン操舵であり、boids由来の要素は「近すぎる個体から離れる（separation）」的な局所回避として部分的に混ざる程度である。出典: [source: https://biomimetics.dev/pages/blog/swarm-intelligence.html] Swarm Intelligence（boids 3規則の定義）

**L193** フローフィールドは「蟻ゲームの手法」というよりRTS／群衆全般の手法で、蟻ゲーム開発者が自作への採用を明言した出典は見つからなかった（EotUについても「flow field採用」の開発者発言は確認できなかった。確認できたのは「最短路が常に選ばれる」「距離判定をタイルベース化した」という記述まで）。手法自体の特性として、共有ゴールへのフローフィールドは「1回の計算で全セル分の方向が得られ、1,000個体でも1個体とほぼ同じ探索コスト」という説明と、Godotでの「per-agent A*は500個体で崩壊し、共有フィールドで10,000個体まで」というベンチマーク記事がある（蟻固有の数値ではない）。出典: [source: https://vav-labs.com/blog/godot-flow-fields-shared-goal/] Flow Field Pathfinding in Godot（Vav Labs）

**L194** 群衆を「流体／粒子」に寄せた研究例 Neozoa（Unity、VR研究）: Unity 5.2.1、i5＋GT 430という控えめな環境で4,000匹を25fpsでシミュレートできたが、VRに必要な70fps超を保つには約1,000匹が実用上限で "noticeable stutter" が生じた。そして律速は描画ではなく "logic processing and collision detection" と明記されている。本作が1,000匹で苦労する構図（単一スレッドで体と衝突を持つ）と正確に対応する。出典: [source: http://www.vonmammen.org/publications/2016-IEEEVR-neozoa.pdf] Neozoa論文（IEEE VR 2016）

**L195** 描画側が律速になった反例: 5,000匹のProcessing製フェロモンシミュレーションは平均0.546fpsで、作者自身が原因を「フェロモンの軌跡をピクセル単位で描くコスト」としている（軌跡をピクセルグリッド表示にすれば軽くなるが、見た目を優先した）。つまり「場をどう描くか」も性能設計の一部であり、本作がCanvasで粒と個体を描く場合にも同じ論点が出る。出典: [source: https://salda.ws/video.php?id=uNIkS0-o2eM] Simple Ant Simulation 5000 Ants

**L196** 11横視点の系譜 — 視点と掘削単位の比較

**L197** 作品地下の視点掘削単位土／荷物の実体

**L198** SimAnt (1991)横視点アリが進んだ経路分なし（看護運搬は計算のみと明言）

**L199** Empires of the Undergrowthトップダウンヘックスタイルなし（卵はワーカーが運ぶ描写あり）

**L200** Pocket Ants横方向に広がる固定巣（断面風）掘削なし・部屋完成形葉・餌は個体が運ぶ

**L201** The Ants: Underground Kingdom断面風タイル領域解放なし（数値）

**L202** Antopolis（開発中）断面（cutaway切替）タイル卵運搬を見せると明記

**L203** AntQueen 3D3D土ブロック生成→運搬あり（ブロック）

**L204** Indy9000/ant-simトップダウン実験場砂粒2×2pxあり（粒）

**L205** ありクリッカー（本作）横視点断面土粒あり（土粒・卵・餌すべて）

**L206** 12比較まとめ — 本作の制約と照らして

**L207** 取り入れられる前例が採用していて、本作でも使える手法

**L208** 目的地を共有する距離場／方向場（フローフィールド的発想）: フェロモンシミュの「環境側が場を持つ」構造と、RTSのフローフィールドは同じ発想の両端にある。巣の各セルから「出口までの距離」「女王までの距離」を掘削時にだけ再計算する場を持てば、個体は毎ステップ場を読むだけでよく、A*の個体別実行を避けられる。決定的固定ステップとも相性が良い（場の再計算タイミングを固定化できる）。EotUの「距離判定をパスベースからタイルベースへ」という最適化も同じ方向。

**L209** 判断の間引き（tick staggering）: tulustul/ants-sandbox の antBrainTickTimeout 系パラメータや、EotU敵AIの「数秒に1回考える」設計、フェロモングループの「応答速度は個体数が多いほど遅くなる」仕様は、いずれも「全個体が毎フレーム判断しない」ことで成立している。固定ステップでも、個体IDで位相をずらした判断間引きは決定性を壊さない。

**L210** 通路設計を速度で誘導する: EotUのハイウェイタイル（速い）／非ハイウェイ（50%遅い）は、渋滞対策を経路探索ではなくレベルデザインと速度場で解く例。横視点でも「太い縦坑」「一方通行に近い勾配」等を速度・幅で誘導できる。

**L211** 女王→産卵→育児容量＝人口上限という律速の三点セット: EotU（育児タイル数＝上限、卵1つ＝餌コスト、貯蔵タイル容量）、Pocket Ants（女王は卵1個ずつ、ワーカー上限は食料加工室Lvで決定）、SimAnt（餌＝エネルギー循環）は共通して「個体数を生む側で絞る」。1,000匹を常時動かす前に、同時稼働数を産卵側で制御する設計は全前例が採用している。

**L212** 仕事の優先順位を固定する: EotUの巣内ジョブは「掘削＞建築＞産卵」の固定順序。渋滞時にタスク競合を単純化できる。

**L213** AntQueen 3D式の工程分離: 「掘る行為」と「出た土を運び出す行為」を分け、運搬が済むまで先へ進めない、という構造は本作の粒運搬とそのまま同型であり、渋滞がゲームプレイ（＝片付け待ち）として正当化される前例になる。

**L214** 場の描画を割り切る: 5,000匹Processing例の失敗（軌跡のピクセル描画で0.5fps）は逆向きの教訓として使える。フェロモンや土の表現をグリッド解像度のテクスチャ更新に寄せる判断は、iPhone SafariのCanvasでも有効なはずである（これは出典からの示唆であり、実測ではない）。

**L215** 使えない前例は使っているが、本作の方針では使えない手法

**L216** 完成形の部屋の出現: Pocket Ants（メニュー建設）、The Ants（"without any obstruction" で配置）、Ant Simulation 3Dサンドボックス（掘削フェーズ省略）、EotUの空洞（掘り当てた瞬間に全体が開く）、itch Anthill Empire（"no digging needed" の側室）。「1粒ずつ掘る」本作では使えない。

**L217** 個体・集団のワープ／テレポート: EotUの巣入口テレポート、Ant Nationのピペットによる集団の掴み上げ移動。物理的に運ぶ・歩く本作では使えない。

**L218** 数値だけの群れ: Ant War（人数配分のみ、目標10億匹）、The Ants（55,000匹／巣は数値）、Ant Legion（軍団の訓練数）。個体に体を持たせる本作では使えない。

**L219** 見せない計算（隠蔽）: SimAntマニュアルが明言する「看護の運搬は画面に出さないが計算する」方式、Pocket Antsのオフライン採集、モバイル4Xの建設タイマー＋スピードアップによる時間の省略。これらは「止まりを隠さない」方針と真っ向から矛盾する。

**L220** フェロモン創発だけに経路を委ねる: SebLague／tulustul／krple系は「着ける保証のない」移動で成立している。巣内の決まった部屋へ卵・餌を確実に届ける必要がある本作の巣内物流には、そのままでは使えない（地上採餌の表現としては採用余地がある）。

**L221** GPU並列化・マルチスレッド前提の最適化: Dan AndersenのGPGPU例やGPU ACOは、単一スレッドHTML/JS（iPhone Safari）という本作の制約では使えない。Neozoaの4,000匹/25fpsもUnity＋専用ロジックでの数値である。

**L222** 人口を絞って問題を消す: EotU本拠300匹、Pocket Ants 232匹という上限設定自体は「1,000匹を目指す」本作の目標とは相容れない（ただし律速として部分採用は可能——上記「取り入れられる」4参照）。

**L223** 独自前例のどれもやっていない — 本作が珍しい点

**L224** 横視点断面 × 粒単位掘削 × 個体の物理運搬の三点セットは、調査した商業・OSS・デモのいずれにも存在しない。各要素の部分的な前例はある: 横視点はSimAnt、粒はIndy9000/ant-sim（実験場・トップダウン・ゲームではない）、土の運搬はAntQueen 3D（3D・ブロック単位）、卵運搬の可視化はAntopolis（タイル単位・開発中）。しかし三点が揃った作品は見つからなかった。

**L225** 土粒・卵・餌のすべてを「実物の物理物体」として統一する設計は前例がない。フェロモン系は荷物＝フラグ、EotUは卵を運ぶが土は消えるだけ、Pocket Antsは葉・餌を運ぶが掘削がない。物質の種類を問わず同じ物理で扱うのは本作だけ。

**L226** 決定的固定ステップ（60fps）を公言する蟻ゲーム／シミュレーションは見つからなかった。前例は可変フレームレート前提（Unity/Unreal）か、確率的フェロモン挙動を売りにするものばかりで、再現性・決定性を設計目標に掲げる例はない。

**L227** 「止まりを隠さない」を方針として掲げる例はない。むしろ全前例が逆（隠す・飛ばす・数値化する・オフラインで進める）であり、渋滞や待ちを見せる対象として扱うのは本作の明確な独自性。

**L228** iPhone Safari単一スレッドで1,000個体級を目指すという制約の組み合わせも前例がない。モバイル蟻ゲームは個体数を232以下に抑えるか数値化しており、ブラウザ個体シミュ（tulustul）はデスクトップ前提で上限500／コロニーをデフォルトにしている。

**L229** 最も近い3作 — それぞれ決定的に1要素欠ける

**L230** Indy9000/ant-sim

**L231** 粒（2×2pxの砂）を個体が物理的に拾い・運び・衝突で落とす。欠ける点: トップダウンの実験場であり、横視点でも、女王・卵・成長を持つゲームでもない。

**L232** AntQueen 3D

**L233** 掘削で生じた土を個体に運ばせないと前進できない。欠ける点: 3Dであり、運ぶ単位は粒ではなくブロック。

**L234** SimAnt

**L235** 横視点の巣で個体が掘り、餌や卵を運ぶ。欠ける点: 土は物体化せず、巣内労働の多く（看護の運搬）は「見せない計算」だとマニュアル自身が明言。

**L236** 13確認できなかったこと

**L237** 公開資料で確認できなかった項目は、推測で埋めずにここに明記します。

**L238** EotUの経路探索アルゴリズム名（A*か否か）、フローフィールド採用の有無、ミッション中のセーブ可否とセーブ形式の詳細: 開発者の明言が見つからなかった。

**L239** Pocket Ants、The Ants、Ant Legionのエンジン・経路探索・最適化手法: いずれも開発者の技術公表が見つからなかった。本ページでのこれらへの言及は、ストア説明・Wiki・攻略情報に基づくシステム面の記述に限る。

**L240** SimAntの内部実装（グリッドの有無、経路探索、人口上限値）: 当時の実装資料が公開されておらず、マニュアルと二次資料の範囲を超えることは書いていない。

**L241** Antopolisの発売状態・実測性能・"thousands of ants" の実態: Steamページの記述（開発中・ロードマップ）以上の情報は確認できなかった。公称値は実測として扱っていない。

**L242** ANT-POCALYPSE等itch.io極小規模作の掘削方式詳細: 一覧ページのタグライン以上の資料がなかった。

**L243** GitHubリポジトリのスター数は変動する。本ページの数値は2026年10月27日時点。

**L244** GDCにおける蟻ゲーム固有の技術講演: EotU等について該当するGDC講演資料は見つからなかった（開発者発信はニュースレター、ポストモーテム、Wikiが中心だった）。

**L245** 出典一覧

**L246** 検証区分: live = 2026年10月27日に調査用実ブラウザで確認／index = 検索インデックス経由で本文確認

**L247** Empires of the Undergrowth — Steamストアページ [source: https://store.steampowered.com/app/463530/Empires_of_the_Undergrowth/?l=norwegian&snr=1_430_4__431] store.steampowered.com/app/463530index

**L248** Empires of the Undergrowth — Basic Mechanics（Wiki） [source: https://empires-of-the-undergrowth.fandom.com/wiki/Basic_Mechanics] empires-of-the-undergrowth.fandom.com/wiki/Basic_Mechanicsindex

**L249** Empires of the Undergrowth — Story Mode（公式Wiki、人口上限） [source: https://wiki.hoodedhorse.com/Empires_of_the_Undergrowth/index.php?title=Story_Mode&direction=prev&oldid=1802] wiki.hoodedhorse.comindex

**L250** Slug Disco — June 2019 Newsletter（UE4最適化の動機） [source: https://slugdisco.com/june-2019-newsletter/] slugdisco.com/june-2019-newsletterindex

**L251** Slug Disco — Build 0.06 Change Log（移動・衝突の再設計） [source: https://slugdisco.com/empires-of-the-undergrowth-build-0-06-change-log/] slugdisco.comindex

**L252** Steamニュース — Jan/Feb 2020 Newsletter（Movement Code全面書換） [source: https://store.steampowered.com/news/app/463530/view/3744117349098958772?l=swedish] store.steampowered.com/newsindex

**L253** Game Developer — Postmortem: How Empires of the Undergrowth came together [source: https://www.gamedeveloper.com/design/postmortem-how-empires-of-the-undergrowth-came-together-in-over-7-years-of-early-access] gamedeveloper.comindex

**L254** SimAnt — Wikipedia [source: https://en.wikipedia.org/wiki/SimAnt] en.wikipedia.org/wiki/SimAntindex

**L255** SimAnt — DOS版マニュアル（看護の隠蔽の明言、行動／カースト配分） [source: https://oldgamesdownload.com/wp-content/uploads/manuals/simant-the-electronic-ant-colony_dos_manual_en_n8j.pdf] oldgamesdownload.com（PDF）index

**L256** SimAnt — SNES版マニュアルテキスト（掘削操作） [source: https://dn720005.ca.archive.org/0/items/kirklands_manual_labor_-_super_nintendo_-_usa_-_2k_version/SimAnt%20-%20The%20Electronic%20Ant%20Colony%20%28USA%29_djvu.txt] archive.orgindex

**L257** Pocket Ants — Google Play公式説明 [source: https://play.google.com/store/apps/details?id=com.ariel.zanyants&hl=en_CA] play.google.comindex

**L258** Pocket Ants — Black Ants（Wiki、最大232匹・巣構造・オフライン採集） [source: https://pocketants.fandom.com/wiki/Black_Ants] pocketants.fandom.com/wiki/Black_Antsindex

**L259** Pocket Ants — Colony Chambers（Wiki） [source: https://pocketants.fandom.com/wiki/Colony_Chambers] pocketants.fandom.com/wiki/Colony_Chambersindex

**L260** The Ants: Underground Kingdom — Google Play公式説明 [source: https://play.google.com/store/apps/details?id=com.allstarunion.ta.soe&hl=en_US] play.google.comindex

**L261** The Ants — APKMirror掲載の配信説明（buildings without obstruction） [source: https://www.apkmirror.com/apk/starunion/the-ants-underground-kingdom/the-ants-underground-kingdom-3-37-2-release/the-ants-underground-kingdom-3-37-2-2-android-apk-download/] apkmirror.comindex

**L262** The Ants — Tutorial（Wiki、タイル数） [source: https://the-ants-underground-kingdom.fandom.com/wiki/Tutorial] the-ants-underground-kingdom.fandom.com/wiki/Tutorialindex

**L263** The Ants — Resource Guide（55,000匹／巣） [source: https://www.bluestacks.com/blog/game-guides/the-ants/tauk-resources-guide-en.html] bluestacks.comindex

**L264** The Ants — Queen Level Upgrade Requirements（タイマー・人口条件） [source: https://simplegameguide.com/queen-level-upgrade-requirements/] simplegameguide.comindex

**L265** The Ants — Android Central紹介 [source: https://www.androidcentral.com/ants-underground-kingdom-android-game-week] androidcentral.comindex

**L266** Ant Legion — Google Play公式説明 [source: https://play.google.com/store/apps/details?id=com.global.antgame] play.google.comindex

**L267** Ant Legion — APKPure解説 [source: https://apkpure.net/ant-legion-for-the-swarm/com.global.antgamevn/amp] apkpure.netindex

**L268** Ant War — GameWatcher（毎日の人数配分） [source: https://www.gamewatcher.com/mods/ant-war-mod/ant-war-demo] gamewatcher.comindex

**L269** Ant War — MobyGames [source: https://www.mobygames.com/game/82541/ant-war/] mobygames.comindex

**L270** Ant Nation — Wikipedia [source: https://en.wikipedia.org/wiki/Ant_Nation] en.wikipedia.org/wiki/Ant_Nationindex

**L271** Ant Nation — Nintendo World Reportレビュー（ピペット） [source: http://www.nintendoworldreport.com/review/19524/ant-nation-wii] nintendoworldreport.comindex

**L272** Antopolis — Steamページ [source: https://store.steampowered.com/app/4910350/] store.steampowered.com/app/4910350index

**L273** AntQueen 3D — Save or Quitレビュー [source: https://saveorquit.com/2019/11/21/review-antqueen-3d/] saveorquit.comindex

**L274** AntQueen 3D — 開発ログ転載（土ブロック運搬） [source: https://tuxdb.com/game/2316&gamenews=1] tuxdb.comindex

**L275** Ant Simulation 3D — App紹介（サンドボックスで掘削省略） [source: https://iphone.apkpure.com/app/ant-simulator-3d/com.mnhksdev.antsimulation] iphone.apkpure.comindex

**L276** ANT-POCALYPSE — itch.ioタグ一覧 [source: https://itch.io/games/code-epl] itch.io/games/code-eplindex

**L277** Anthill Empire — itch.io開発ログ（no digging needed） [source: https://hatmat1.itch.io/anthill-empire/devlog/1728593/anthill-empire-devlog-the-big-update] hatmat1.itch.ioindex

**L278** Colony Sim — itch.io開発ログ [source: https://digital-scientist.itch.io/colony-sim/devlog/1728369/v07-queens-orders-hunting-grounds-visible-brood-and-a-colony-that-lasts-the-winter] digital-scientist.itch.ioindex

**L279** Ant Colony Sim — itch.io（NervesOfJello/Ants-AI） [source: https://dababnehdesign.itch.io/ant-colony-simulation] dababnehdesign.itch.ioindex

**L280** Indy9000/ant-sim — GitHub（砂粒2×2px、situated objects） [source: https://github.com/Indy9000/ant-sim] github.com/Indy9000/ant-simindex

**L281** Indy9000 — Modelling Ant Nest Construction（解説ブログ） [source: https://indy9000.blog/posts/modelling-ant-nest-construction.html] indy9000.blogindex

**L282** SebLague/Ant-Simulation — GitHub（★263、fork 31） [source: https://github.com/SebLague/Ant-Simulation] github.com/SebLague/Ant-Simulationlive

**L283** tulustul/ants-sandbox — GitHub（★105、fork 8） [source: https://github.com/tulustul/ants-sandbox] github.com/tulustul/ants-sandboxlive

**L284** tulustul/ants-sandbox — DeepWiki設定解析（上限500、Pixi.js等） [source: https://deepwiki.com/tulustul/ants-sandbox/6.1-settings-and-configuration] deepwiki.comindex

**L285** krple/colony-ant-simulator — GitHubミラー（推奨10〜100匹） [source: https://github.saobby.my.eu.org/krple/colony-ant-simulator] github.saobby.my.eu.orgindex

**L286** Dan Andersen — GPU-Accelerated 3D Ant Colony Simulation [source: https://dan.andersen.name/projects/2015-01-04-gpu-ant-sim/] dan.andersen.nameindex

**L287** Neozoa論文 — Unity VR蟻シミュレーション性能（4,000匹25fps、律速はロジックと衝突） [source: http://www.vonmammen.org/publications/2016-IEEEVR-neozoa.pdf] vonmammen.org（PDF）index

**L288** Simple Ant Simulation 5000 Ants — Processing例（0.546fps、描画律速） [source: https://salda.ws/video.php?id=uNIkS0-o2eM] salda.wsindex

**L289** Vav Labs — Flow Field Pathfinding in Godot（共有フィールドと個体別A*の比較） [source: https://vav-labs.com/blog/godot-flow-fields-shared-goal/] vav-labs.comindex

**L290** Biomimetics.dev — Swarm Intelligence（boids 3規則の定義） [source: https://biomimetics.dev/pages/blog/swarm-intelligence.html] biomimetics.devindex

**L291** Sebastian Lague — Coding Adventure: Ant and Slime Simulations（ACOと可視シミュの構成） [source: https://cyberspaceandtime.com/CODING-ADVENTURE-ANT-AND-SLIME-SIMULATIONS-mtXyQ-OKiKmSrMQVaQKugRXOz0d2j1bQA.htm] cyberspaceandtime.comindex
