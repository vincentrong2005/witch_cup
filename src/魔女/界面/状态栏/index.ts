import { waitUntil } from 'async-wait-until';
import { Schema, type Schema as StatusData } from '../../schema';
import './styles.css';

type AttributeKey = keyof StatusData['魔女状态']['基础属性'];
type BodyRecord = StatusData['魔女状态']['身体记录'][string];
type SyncTool = StatusData['魔女状态']['同步道具'][string];
type InventoryItem = StatusData['主角']['物品栏'][string];
type InfoPanel = 'body' | 'inventory';

const portraitUrls = [
  'https://img.vinsimage.org/%E9%AD%94%E5%A5%B3/%E9%AD%94%E5%A5%B3/%E9%AD%94%E5%A5%B31.png',
  'https://img.vinsimage.org/%E9%AD%94%E5%A5%B3/%E9%AD%94%E5%A5%B3/%E9%AD%94%E5%A5%B32.png',
  'https://img.vinsimage.org/%E9%AD%94%E5%A5%B3/%E9%AD%94%E5%A5%B3/%E9%AD%94%E5%A5%B33.png',
];

const syncToolImageUrls: Record<string, string> = {
  口腔型魔导杯: 'https://img.vinsimage.org/%E9%AD%94%E5%A5%B3/%E5%8F%A3%E8%85%94%E5%9E%8B%E9%AD%94%E5%AF%BC%E6%9D%AF.png',
  下体型魔导杯: 'https://img.vinsimage.org/%E9%AD%94%E5%A5%B3/%E4%B8%8B%E4%BD%93%E5%9E%8B%E9%AD%94%E5%AF%BC%E6%9D%AF.png',
  躯干型魔导器: 'https://img.vinsimage.org/%E9%AD%94%E5%A5%B3/%E8%BA%AF%E5%B9%B2%E5%9E%8B%E9%AD%94%E5%AF%BC%E5%99%A8.png',
  躯干形魔导器: 'https://img.vinsimage.org/%E9%AD%94%E5%A5%B3/%E8%BA%AF%E5%B9%B2%E5%9E%8B%E9%AD%94%E5%AF%BC%E5%99%A8.png',
};

const attributeMeta: Record<AttributeKey, { icon: string; accent: string }> = {
  耐久值: { icon: 'shield', accent: '168 82% 62%' },
  堕落度: { icon: 'flame', accent: '333 88% 70%' },
  服从度: { icon: 'chain', accent: '275 86% 72%' },
  敏感度: { icon: 'spark', accent: '39 96% 71%' },
};

const icons = {
  shield: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 19 6v5c0 4.5-2.8 8-7 10-4.2-2-7-5.5-7-10V6l7-3Z"/></svg>',
  flame:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21c3.8 0 6.5-2.7 6.5-6.2 0-2.8-1.7-5.1-4.8-8.5-.6 2.6-2 4-3.9 5.7.2-2.4-.7-4.5-2.4-6.3C6 8.8 5.5 11 5.5 14.4 5.5 18.2 8.2 21 12 21Z"/></svg>',
  chain:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 13 4-4"/><path d="M8.5 16.5 6.8 18.2a3.5 3.5 0 0 1-5-5L5 10"/><path d="m19 14 3.2-3.2a3.5 3.5 0 0 0-5-5L15.5 7.5"/></svg>',
  spark:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2 5 14h6l-1 8 9-13h-6l0-7Z"/></svg>',
};

let currentData: StatusData | null = null;

const getElement = <T extends HTMLElement>(id: string) => {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`缺少界面元素: ${id}`);
  }
  return element as T;
};

const clampPercent = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const toElementId = (prefix: string, name: string) =>
  `${prefix}-${name
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()}`;

const sensitivityDots = (level: number) =>
  Array.from({ length: 5 }, (_, index) => `<span class="dot${index < level ? ' active' : ''}"></span>`).join('');

const renderAttribute = (name: AttributeKey, value: number) => {
  const meta = attributeMeta[name];
  const percent = clampPercent(value);
  return `
    <article id="${toElementId('attribute-card', name)}" class="attribute-card" style="--accent-hsl: ${meta.accent};">
      <div class="attribute-top">
        <p class="attribute-name">${name}</p>
        <span class="mini-icon">${icons[meta.icon as keyof typeof icons]}</span>
      </div>
      <p class="attribute-value">${percent}</p>
      <div class="meter" aria-label="${name} ${percent}">
        <div class="meter-fill" style="--value: ${percent};"></div>
      </div>
    </article>
  `;
};

const renderBodyRecord = ([name, record]: [string, BodyRecord]) => {
  const degree = clampPercent(record.开发程度);
  const sensitivity = Math.max(0, Math.min(5, Math.round(record.敏感等级)));
  return `
    <article id="${toElementId('body-card', name)}" class="body-card">
      <p class="body-name">${name}</p>
      <div class="body-meta">
        <span class="body-degree">${degree}</span>
        <span class="sensitivity-dots" aria-label="敏感等级 ${sensitivity}">${sensitivityDots(sensitivity)}</span>
      </div>
      <div class="meter" aria-label="${name}开发程度 ${degree}">
        <div class="meter-fill" style="--value: ${degree};"></div>
      </div>
      <p class="body-status">${record.特殊状态}</p>
    </article>
  `;
};

const renderSyncTool = ([name, tool]: [string, SyncTool]) => {
  const syncing = tool.是否同步;
  const imageUrl = syncToolImageUrls[name];
  return `
    <article id="${toElementId('sync-tool-card', name)}" class="tool-card${syncing ? '' : ' offline'}">
      <button type="button" class="tool-image-button" data-sync-tool="${encodeURIComponent(name)}" aria-label="查看${name}详情">
        ${
          imageUrl
            ? `<img class="tool-image" src="${imageUrl}" alt="${name}" />`
            : '<span class="tool-image-placeholder"></span>'
        }
      </button>
    </article>
  `;
};

const renderInventoryItem = ([name, item]: [string, InventoryItem]) => `
  <article id="${toElementId('inventory-item', name)}" class="item-card">
    <div class="item-top">
      <p class="item-name">${name}</p>
      <span class="item-quantity">${item.数量}</span>
    </div>
    <p class="item-description">${item.描述}</p>
  </article>
`;

const getStatusData = () => {
  const variables = Mvu.getMvuData({ type: 'message', message_id: getCurrentMessageId() });
  return Schema.parse(_.get(variables, 'stat_data'));
};

const render = (data: StatusData) => {
  currentData = data;
  getElement('status-location').textContent = data.系统状态.地点;
  getElement('status-time').textContent = data.系统状态.时间;

  const attributes = Object.entries(data.魔女状态.基础属性) as [AttributeKey, number][];
  getElement('attribute-grid').innerHTML = attributes.map(([name, value]) => renderAttribute(name, value)).join('');

  const bodyRecords = Object.entries(data.魔女状态.身体记录);
  getElement('body-record-grid').innerHTML = bodyRecords.map(renderBodyRecord).join('');
  getElement('body-count').textContent = `${bodyRecords.length} 项`;

  const syncTools = Object.entries(data.魔女状态.同步道具);
  const syncingCount = syncTools.filter(([, tool]) => tool.是否同步).length;
  getElement('sync-tool-list').innerHTML = syncTools.map(renderSyncTool).join('');
  getElement('sync-count').textContent = `${syncTools.length} 件`;
  getElement('sync-summary').textContent = syncingCount > 0 ? `${syncingCount} 件道具同步中` : '当前无同步';

  const inventory = Object.entries(data.主角.物品栏);
  getElement('inventory-count').textContent = `${inventory.length} 件`;
  getElement('inventory-grid').innerHTML =
    inventory.length > 0
      ? inventory.map(renderInventoryItem).join('')
      : '<p class="empty-state">物品栏暂无可显示物品</p>';
};

const renderFromVariables = () => {
  try {
    render(getStatusData());
  } catch (error) {
    console.error('[魔女状态栏] 变量渲染失败', error);
  }
};

const setRandomPortrait = () => {
  const portraitImage = getElement<HTMLImageElement>('portrait-image');
  let portraitIndex = Math.floor(Math.random() * portraitUrls.length);

  portraitImage.onerror = () => {
    portraitIndex = (portraitIndex + 1) % portraitUrls.length;
    portraitImage.src = portraitUrls[portraitIndex];
  };
  portraitImage.src = portraitUrls[portraitIndex];
};

const bindPortraitToggle = () => {
  const panel = getElement('witch-portrait-panel');
  const stage = getElement('witch-portrait-stage');
  const clickToToggle = window.matchMedia('(hover: none), (pointer: coarse)').matches;

  const toggleAttributes = () => {
    const expanded = panel.classList.toggle('attributes-open');
    panel.setAttribute('aria-expanded', String(expanded));
  };

  stage.addEventListener('click', () => {
    if (clickToToggle) {
      toggleAttributes();
    }
  });
  stage.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleAttributes();
    }
  });
  panel.addEventListener('mouseenter', () => panel.setAttribute('aria-expanded', 'true'));
  panel.addEventListener('mouseleave', () => {
    if (!panel.classList.contains('attributes-open')) {
      panel.setAttribute('aria-expanded', 'false');
    }
  });
};

const setActiveInfoPanel = (panel: InfoPanel) => {
  document.querySelectorAll<HTMLElement>('.info-switch').forEach(button => {
    button.classList.toggle('active', button.dataset.infoPanel === panel);
  });

  getElement('body-record-grid').classList.toggle('active', panel === 'body');
  getElement('inventory-grid').classList.toggle('active', panel === 'inventory');
  getElement('info-detail-title').textContent = panel === 'body' ? '身体记录' : '物品栏';
  getElement('sync-detail-view').hidden = true;
  getElement('info-detail-view').hidden = false;
};

const openSyncDetail = (name: string) => {
  const tool = _.get(currentData, ['魔女状态', '同步道具', name]) as SyncTool | undefined;
  if (!tool) {
    return;
  }

  getElement('sync-detail-name').textContent = name;
  getElement('sync-detail-status').textContent = `状态：${tool.状态}`;
  getElement('sync-detail-count').textContent = `使用次数：${tool.使用次数}`;
  getElement('sync-detail-image').innerHTML = syncToolImageUrls[name]
    ? `<img class="tool-image detail-tool-image" src="${syncToolImageUrls[name]}" alt="${name}" />`
    : '';
  getElement('info-detail-view').hidden = true;
  getElement('sync-detail-view').hidden = false;
};

const closeSyncDetail = () => {
  getElement('sync-detail-view').hidden = true;
};

const closeInfoDetail = () => {
  getElement('info-detail-view').hidden = true;
};

const bindStatusWorkspace = () => {
  getElement('status-workspace').addEventListener('click', event => {
    const target = event.target as HTMLElement;
    const infoButton = target.closest<HTMLElement>('[data-info-panel]');
    const syncButton = target.closest<HTMLElement>('[data-sync-tool]');

    if (infoButton?.dataset.infoPanel === 'body' || infoButton?.dataset.infoPanel === 'inventory') {
      setActiveInfoPanel(infoButton.dataset.infoPanel);
    }

    if (syncButton?.dataset.syncTool) {
      openSyncDetail(decodeURIComponent(syncButton.dataset.syncTool));
    }
  });

  getElement('sync-detail-close').addEventListener('click', closeSyncDetail);
  getElement('info-detail-close').addEventListener('click', closeInfoDetail);
};

$(async () => {
  setRandomPortrait();
  bindPortraitToggle();
  bindStatusWorkspace();

  await waitGlobalInitialized('Mvu');
  await waitUntil(() => _.has(getVariables({ type: 'message' }), 'stat_data'));

  renderFromVariables();
  eventOn(Mvu.events.VARIABLE_INITIALIZED, renderFromVariables);
  eventOn(Mvu.events.VARIABLE_UPDATE_ENDED, renderFromVariables);
  eventOn(Mvu.events.BEFORE_MESSAGE_UPDATE, renderFromVariables);
});
