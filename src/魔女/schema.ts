const boundedNumber = (min: number, max: number) => z.coerce.number().transform(value => _.clamp(value, min, max));

const ItemSchema = z.object({
  描述: z.string(),
  数量: z.coerce.number().optional().default(1),
});

const BodyPartSchema = z.object({
  开发程度: boundedNumber(0, 100),
  敏感等级: boundedNumber(0, 5),
  特殊状态: z.string(),
});

const SyncToolSchema = z.object({
  状态: z.string(),
  是否同步: z.coerce.boolean(),
  使用次数: z.coerce.number().optional().default(0),
});

export const Schema = z.object({
  系统状态: z.object({
    地点: z.string(),
    时间: z.string(),
  }),

  魔女状态: z.object({
    基础属性: z.object({
      耐久值: boundedNumber(0, 100),
      堕落度: boundedNumber(0, 100),
      服从度: boundedNumber(0, 100),
      敏感度: boundedNumber(0, 100),
    }),
    身体记录: z.record(z.string().describe('部位名'), BodyPartSchema),
    同步道具: z.record(z.string().describe('道具名'), SyncToolSchema),
  }),

  主角: z.object({
    物品栏: z
      .record(z.string().describe('物品名'), ItemSchema)
      .transform(data => _.pickBy(data, item => item.数量 > 0)),
  }),
});

export type Schema = z.output<typeof Schema>;
