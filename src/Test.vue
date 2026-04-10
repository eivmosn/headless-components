<script setup lang="ts">
import Table from './components/table/index.vue'

type Align = 'left' | 'center' | 'right'

interface TableColumn {
  key: string
  title: string
  width?: number
  align?: Align
  fixed?: 'left' | 'right'
  children?: TableColumn[]
}

const columns: TableColumn[] = [
  {
    key: 'order_group',
    title: 'Order',
    fixed: 'left',
    align: 'center',
    children: [
      {
        key: 'order_id',
        title: 'Order ID',
        width: 160,
        align: 'center',
        fixed: 'left',
      },
      {
        key: 'customer',
        title: 'Customer',
        width: 180,
        align: 'center',
        fixed: 'left',
      },
    ],
  },
  {
    key: 'location_group',
    title: 'Location',
    align: 'center',
    children: [
      {
        key: 'region',
        title: 'Region',
        width: 150,
        align: 'center',
      },
      {
        key: 'owner',
        title: 'Owner',
        width: 150,
        align: 'center',
      },
    ],
  },
  {
    key: 'business_group',
    title: 'Business',
    align: 'center',
    children: [
      {
        key: 'status',
        title: 'Status',
        width: 140,
        align: 'center',
      },
      {
        key: 'amount',
        title: 'Amount',
        width: 160,
        align: 'right',
      },
      {
        key: 'priority',
        title: 'Priority',
        width: 130,
        align: 'center',
      },
      {
        key: 'channel',
        title: 'Channel',
        width: 140,
        align: 'center',
      },
    ],
  },
  {
    key: 'time_group',
    title: 'Timeline',
    align: 'center',
    children: [
      {
        key: 'created_at',
        title: 'Created At',
        width: 180,
        align: 'center',
      },
      {
        key: 'updated_at',
        title: 'Updated At',
        width: 180,
        align: 'center',
      },
      {
        key: 'progress',
        title: 'Progress',
        width: 140,
        align: 'right',
      },
    ],
  },
  {
    key: 'remark',
    title: 'Remark',
    width: 260,
    align: 'center',
    fixed: 'right',
  },
]

const data = [
  {
    id: '1',
    order_id: 'SO-2026-001',
    customer: 'Northwind Labs',
    region: 'Shanghai',
    owner: 'Ava',
    status: 'Running',
    amount: '$12,860.00',
    priority: 'P0',
    channel: 'API',
    created_at: '2026-04-01 09:12',
    updated_at: '2026-04-10 10:21',
    progress: '82%',
    remark: 'Waiting for contract review.',
  },
  {
    id: '2',
    order_id: 'SO-2026-002',
    customer: 'Blue Peak Labs',
    region: 'Hangzhou',
    owner: 'Noah',
    status: 'Pending',
    amount: '$8,420.00',
    priority: 'P1',
    channel: 'Email',
    created_at: '2026-04-01 11:20',
    updated_at: '2026-04-10 09:48',
    progress: '36%',
    remark: 'Customer requested delayed activation.',
  },
  {
    id: '3',
    order_id: 'SO-2026-003',
    customer: 'Signal River Labs',
    region: 'Beijing',
    owner: 'Mia',
    status: 'Blocked',
    amount: '$19,340.00',
    priority: 'P0',
    channel: 'Webhook',
    created_at: '2026-04-02 08:10',
    updated_at: '2026-04-10 10:05',
    progress: '15%',
    remark: 'Finance approval missing.',
  },
  {
    id: '4',
    order_id: 'SO-2026-004',
    customer: 'Acorn Mobile',
    region: 'Shenzhen',
    owner: 'Liam',
    status: 'Running',
    amount: '$4,670.00',
    priority: 'P2',
    channel: 'Manual',
    created_at: '2026-04-02 13:45',
    updated_at: '2026-04-10 10:16',
    progress: '64%',
    remark: 'Monitoring first migration wave.',
  },
  {
    id: '5',
    order_id: 'SO-2026-005',
    customer: 'Atlas Retail',
    region: 'Guangzhou',
    owner: 'Emma',
    status: 'Review',
    amount: '$15,230.00',
    priority: 'P1',
    channel: 'API',
    created_at: '2026-04-03 09:32',
    updated_at: '2026-04-10 10:29',
    progress: '58%',
    remark: 'Need to confirm reporting fields.',
  },
  {
    id: '6',
    order_id: 'SO-2026-006',
    customer: 'Pixel Harbor',
    region: 'Chengdu',
    owner: 'Lucas',
    status: 'Running',
    amount: '$6,980.00',
    priority: 'P2',
    channel: 'Webhook',
    created_at: '2026-04-03 15:10',
    updated_at: '2026-04-10 10:42',
    progress: '73%',
    remark: 'Stable after first sync.',
  },
  {
    id: '7',
    order_id: 'SO-2026-007',
    customer: 'Nova Freight',
    region: 'Wuhan',
    owner: 'Sophia',
    status: 'Pending',
    amount: '$22,410.00',
    priority: 'P0',
    channel: 'Email',
    created_at: '2026-04-04 08:22',
    updated_at: '2026-04-10 11:03',
    progress: '27%',
    remark: 'Large dataset import queued tonight.',
  },
  {
    id: '8',
    order_id: 'SO-2026-008',
    customer: 'Oak Systems',
    region: 'Nanjing',
    owner: 'Ethan',
    status: 'Review',
    amount: '$9,760.00',
    priority: 'P2',
    channel: 'Manual',
    created_at: '2026-04-04 10:35',
    updated_at: '2026-04-10 11:21',
    progress: '49%',
    remark: 'One more permission scope check.',
  },
  {
    id: '9',
    order_id: 'SO-2026-009',
    customer: 'Sunrise Chain',
    region: 'Suzhou',
    owner: 'Olivia',
    status: 'Done',
    amount: '$5,120.00',
    priority: 'P3',
    channel: 'API',
    created_at: '2026-04-05 09:00',
    updated_at: '2026-04-10 12:12',
    progress: '100%',
    remark: 'Deployment completed successfully.',
  },
  {
    id: '10',
    order_id: 'SO-2026-010',
    customer: 'Aurora Bio',
    region: 'Xiamen',
    owner: 'James',
    status: 'Running',
    amount: '$13,540.00',
    priority: 'P1',
    channel: 'Webhook',
    created_at: '2026-04-05 11:18',
    updated_at: '2026-04-10 13:04',
    progress: '68%',
    remark: 'Observing retry strategy after patch.',
  },
  {
    id: '11',
    order_id: 'SO-2026-011',
    customer: 'Cedar Health',
    region: 'Tianjin',
    owner: 'Charlotte',
    status: 'Blocked',
    amount: '$17,860.00',
    priority: 'P0',
    channel: 'Email',
    created_at: '2026-04-06 08:48',
    updated_at: '2026-04-10 13:27',
    progress: '21%',
    remark: 'Security review still pending.',
  },
  {
    id: '12',
    order_id: 'SO-2026-012',
    customer: 'Harbor Net',
    region: 'Qingdao',
    owner: 'Benjamin',
    status: 'Pending',
    amount: '$7,300.00',
    priority: 'P3',
    channel: 'Manual',
    created_at: '2026-04-06 16:15',
    updated_at: '2026-04-10 14:02',
    progress: '33%',
    remark: 'Waiting for customer-side window.',
  },
]
</script>

<template>
  <div class="test-page">
    <Table
      :columns="columns"
      :data="data"
      :fixed-top-rows="2"
      :fixed-bottom-rows="2"
      height="800px"
    />
  </div>
</template>

<style scoped>
.test-page {
  padding: 24px;
  background: #f8fafc;
  box-sizing: border-box;
}
</style>
