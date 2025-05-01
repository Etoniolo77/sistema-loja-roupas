/**
 * Utility functions for transforming API data into chart-friendly formats
 */

/**
 * Transforms sales data for visualization in charts
 * @param {Array} salesData - Raw sales data from API
 * @returns {Object} Formatted data for different chart types
 */
export const transformSalesData = (salesData) => {
  if (!salesData || !salesData.vendas || !salesData.resumo) {
    return { barData: [], pieData: [], lineData: [] };
  }

  // Group sales by date for line/area charts
  const salesByDate = {};
  salesData.vendas.forEach(venda => {
    const date = new Date(venda.data).toLocaleDateString('pt-BR');
    if (!salesByDate[date]) {
      salesByDate[date] = {
        date,
        total: 0,
        count: 0
      };
    }
    salesByDate[date].total += venda.valor_total;
    salesByDate[date].count += 1;
  });

  // Convert to array and sort by date
  const lineData = Object.values(salesByDate).sort((a, b) => {
    return new Date(a.date.split('/').reverse().join('-')) - 
           new Date(b.date.split('/').reverse().join('-'));
  });

  // Group sales by payment method for pie chart
  const salesByPaymentMethod = {};
  salesData.vendas.forEach(venda => {
    const method = venda.forma_pagamento || 'não especificado';
    if (!salesByPaymentMethod[method]) {
      salesByPaymentMethod[method] = {
        name: formatPaymentMethod(method),
        value: 0,
        count: 0
      };
    }
    salesByPaymentMethod[method].value += venda.valor_total;
    salesByPaymentMethod[method].count += 1;
  });

  // Convert to array
  const pieData = Object.values(salesByPaymentMethod);

  // Group sales by status for bar chart
  const salesByStatus = {};
  salesData.vendas.forEach(venda => {
    const status = venda.status || 'não especificado';
    if (!salesByStatus[status]) {
      salesByStatus[status] = {
        name: formatStatus(status),
        valor: 0,
        quantidade: 0
      };
    }
    salesByStatus[status].valor += venda.valor_total;
    salesByStatus[status].quantidade += 1;
  });

  // Convert to array
  const barData = Object.values(salesByStatus);

  return { barData, pieData, lineData };
};

/**
 * Transforms product data for visualization in charts
 * @param {Array} productData - Raw product data from API
 * @returns {Object} Formatted data for different chart types
 */
export const transformProductData = (productData) => {
  if (!productData || !productData.produtos || !productData.resumo) {
    return { barData: [], pieData: [] };
  }

  // Sort products by quantity sold for bar chart
  const barData = [...productData.produtos]
    .sort((a, b) => b.quantidade_vendida - a.quantidade_vendida)
    .slice(0, 10) // Top 10 products
    .map(produto => ({
      name: produto.nome + (produto.tamanho ? ` (${produto.tamanho})` : ''),
      quantidade: produto.quantidade_vendida,
      valor: produto.valor_total
    }));

  // Group products by size for pie chart
  const productsBySize = {};
  productData.produtos.forEach(produto => {
    const size = produto.tamanho || 'não especificado';
    if (!productsBySize[size]) {
      productsBySize[size] = {
        name: size,
        value: 0
      };
    }
    productsBySize[size].value += produto.quantidade_vendida;
  });

  // Convert to array
  const pieData = Object.values(productsBySize);

  return { barData, pieData };
};

/**
 * Transforms client data for visualization in charts
 * @param {Array} clientData - Raw client data from API
 * @returns {Object} Formatted data for different chart types
 */
export const transformClientData = (clientData) => {
  if (!clientData || !clientData.clientes || !clientData.resumo) {
    return { barData: [], pieData: [] };
  }

  // Sort clients by total purchases for bar chart
  const barData = [...clientData.clientes]
    .sort((a, b) => b.valor_total - a.valor_total)
    .slice(0, 10) // Top 10 clients
    .map(cliente => ({
      name: cliente.nome,
      compras: cliente.total_compras,
      valor: cliente.valor_total
    }));

  // Group clients by purchase frequency
  const clientsByFrequency = {
    'Uma compra': { name: 'Uma compra', value: 0 },
    'Duas compras': { name: 'Duas compras', value: 0 },
    'Três compras': { name: 'Três compras', value: 0 },
    'Quatro ou mais': { name: 'Quatro ou mais', value: 0 }
  };

  clientData.clientes.forEach(cliente => {
    if (cliente.total_compras === 1) {
      clientsByFrequency['Uma compra'].value += 1;
    } else if (cliente.total_compras === 2) {
      clientsByFrequency['Duas compras'].value += 1;
    } else if (cliente.total_compras === 3) {
      clientsByFrequency['Três compras'].value += 1;
    } else {
      clientsByFrequency['Quatro ou mais'].value += 1;
    }
  });

  // Convert to array
  const pieData = Object.values(clientsByFrequency);

  return { barData, pieData };
};

/**
 * Transforms inventory data for visualization in charts
 * @param {Array} inventoryData - Raw inventory data from API
 * @returns {Object} Formatted data for different chart types
 */
export const transformInventoryData = (inventoryData) => {
  if (!inventoryData || !inventoryData.produtos || !inventoryData.resumo) {
    return { barData: [], pieData: [] };
  }

  // Sort products by quantity for bar chart
  const barData = [...inventoryData.produtos]
    .sort((a, b) => b.quantidade - a.quantidade)
    .slice(0, 15) // Top 15 products
    .map(produto => ({
      name: produto.nome + (produto.tamanho ? ` (${produto.tamanho})` : ''),
      quantidade: produto.quantidade,
      valor: produto.valor_estoque
    }));

  // Group products by inventory level for pie chart
  const pieData = [
    { name: 'Estoque Baixo', value: inventoryData.resumo.estoque_baixo },
    { name: 'Estoque Médio', value: inventoryData.resumo.estoque_medio },
    { name: 'Estoque Adequado', value: inventoryData.resumo.estoque_adequado }
  ];

  return { barData, pieData };
};

/**
 * Transforms sales by seller data for visualization in charts
 * @param {Object} sellerData - Raw seller sales data from API
 * @returns {Object} Formatted data for different chart types
 */
export const transformSellerSalesData = (sellerData) => {
  if (!sellerData || !sellerData.vendedores || !sellerData.resumo) {
    return { barData: [], pieData: [], lineData: [] };
  }

  // Sort sellers by total sales for bar chart
  const barData = [...sellerData.vendedores]
    .sort((a, b) => b.valor_total - a.valor_total)
    .map(vendedor => ({
      name: vendedor.vendedor,
      valor: vendedor.valor_total,
      quantidade: vendedor.total_vendas
    }));

  // Group sales by seller for pie chart
  const pieData = [...sellerData.vendedores]
    .map(vendedor => ({
      name: vendedor.vendedor,
      value: vendedor.valor_total
    }));

  // Group sales by payment method for each seller
  const paymentMethodData = {};
  if (sellerData.formasPagamento) {
    sellerData.formasPagamento.forEach(item => {
      if (!paymentMethodData[item.vendedor]) {
        paymentMethodData[item.vendedor] = [];
      }
      
      paymentMethodData[item.vendedor].push({
        name: formatPaymentMethod(item.forma_pagamento),
        value: item.valor_total
      });
    });
  }

  // Prepare comparison data for sellers
  const comparisonData = [...sellerData.vendedores]
    .map(vendedor => ({
      name: vendedor.vendedor,
      vendas: vendedor.total_vendas,
      concluidas: vendedor.vendas_concluidas,
      canceladas: vendedor.vendas_canceladas,
      pendentes: vendedor.vendas_pendentes,
      ticket: vendedor.ticket_medio
    }));

  return { 
    barData, 
    pieData, 
    paymentMethodData,
    comparisonData
  };
};

/**
 * Helper function to format payment method names
 * @param {string} method - Payment method code
 * @returns {string} Formatted payment method name
 */
const formatPaymentMethod = (method) => {
  const methods = {
    'especie': 'Dinheiro',
    'cartao_credito': 'Cartão de Crédito',
    'cartao_debito': 'Cartão de Débito',
    'pix': 'PIX',
    'crediario': 'Crediário',
    'transferencia': 'Transferência',
    'cheque': 'Cheque'
  };
  
  return methods[method] || method;
};

/**
 * Helper function to format status names
 * @param {string} status - Status code
 * @returns {string} Formatted status name
 */
const formatStatus = (status) => {
  const statuses = {
    'concluida': 'Concluída',
    'pendente': 'Pendente',
    'cancelada': 'Cancelada'
  };
  
  return statuses[status] || status;
};