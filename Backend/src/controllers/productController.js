const Product = require('../models/Product');
const { generateUniqueBarcode, findProductByBarcode } = require('../services/barcodeService');

/**
 * POST /api/products  (manager only)
 * Body: { name, category, price, costPrice, quantity, supplierName, supplierContact,
 *         supplierEmail?, reorderThreshold? }
 */
const createProduct = async (req, res, next) => {
  try {
    const {
      name, category, price, costPrice, quantity,
      supplierName, supplierContact, supplierEmail, reorderThreshold,
    } = req.body;

    // ── Required fields ───────────────────────────────────────────────────────
    if (!name || !category || price === undefined || costPrice === undefined ||
        quantity === undefined || !supplierName || !supplierContact) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'name, category, price, costPrice, quantity, supplierName, and supplierContact are required.',
      });
    }

    if (isNaN(price) || Number(price) < 0)
      return res.status(400).json({ success: false, error: 'Validation Error', message: 'Price (selling) must be a non-negative number.' });

    if (isNaN(costPrice) || Number(costPrice) < 0)
      return res.status(400).json({ success: false, error: 'Validation Error', message: 'Cost price must be a non-negative number.' });

    if (isNaN(quantity) || Number(quantity) < 0)
      return res.status(400).json({ success: false, error: 'Validation Error', message: 'Quantity must be a non-negative number.' });

    if (reorderThreshold !== undefined && (isNaN(reorderThreshold) || Number(reorderThreshold) < 0))
      return res.status(400).json({ success: false, error: 'Validation Error', message: 'Reorder threshold must be a non-negative number.' });

    const barcode = await generateUniqueBarcode();

    const product = await Product.create({
      barcode,
      name:             name.trim(),
      category:         category.trim(),
      price:            Number(price),
      costPrice:        Number(costPrice),
      quantity:         Number(quantity),
      supplierName:     supplierName.trim(),
      supplierContact:  supplierContact.trim(),
      supplierEmail:    supplierEmail ? supplierEmail.trim().toLowerCase() : '',
      reorderThreshold: reorderThreshold !== undefined ? Number(reorderThreshold) : 5,
    });

    res.status(201).json({
      success: true,
      message: 'Product created successfully.',
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/products  (both roles)
 * Optional query: ?category=  ?search=
 */
const getAllProducts = async (req, res, next) => {
  try {
    const filter = {};

    if (req.query.category) {
      filter.category = { $regex: req.query.category, $options: 'i' };
    }
    if (req.query.search) {
      filter.$or = [
        { name:    { $regex: req.query.search, $options: 'i' } },
        { barcode: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    const products = await Product.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: 'Products retrieved successfully.',
      data: products,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/products/barcode/:code  (both roles)
 */
const getProductByBarcode = async (req, res, next) => {
  try {
    const product = await findProductByBarcode(req.params.code);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: `No product found with barcode "${req.params.code}".`,
      });
    }

    res.status(200).json({ success: true, message: 'Product found.', data: product });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/products/low-stock  (manager only)
 */
const getLowStockProducts = async (req, res, next) => {
  try {
    const products = await Product.find({
      $expr: { $lt: ['$quantity', '$reorderThreshold'] },
    }).sort({ quantity: 1 });

    res.status(200).json({
      success: true,
      message: 'Low stock products retrieved.',
      data: products,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/products/:id  (manager only)
 * Barcode cannot be changed. All other fields are optional.
 */
const updateProduct = async (req, res, next) => {
  try {
    if (req.body.barcode) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Barcode cannot be modified after product creation.',
      });
    }

    const {
      name, category, price, costPrice, quantity,
      supplierName, supplierContact, supplierEmail, reorderThreshold,
    } = req.body;

    if (price !== undefined && (isNaN(price) || Number(price) < 0))
      return res.status(400).json({ success: false, error: 'Validation Error', message: 'Price must be a non-negative number.' });
    if (costPrice !== undefined && (isNaN(costPrice) || Number(costPrice) < 0))
      return res.status(400).json({ success: false, error: 'Validation Error', message: 'Cost price must be a non-negative number.' });
    if (quantity !== undefined && (isNaN(quantity) || Number(quantity) < 0))
      return res.status(400).json({ success: false, error: 'Validation Error', message: 'Quantity must be a non-negative number.' });
    if (reorderThreshold !== undefined && (isNaN(reorderThreshold) || Number(reorderThreshold) < 0))
      return res.status(400).json({ success: false, error: 'Validation Error', message: 'Reorder threshold must be a non-negative number.' });

    const updateFields = {};
    if (name            !== undefined) updateFields.name            = name.trim();
    if (category        !== undefined) updateFields.category        = category.trim();
    if (price           !== undefined) updateFields.price           = Number(price);
    if (costPrice       !== undefined) updateFields.costPrice       = Number(costPrice);
    if (quantity        !== undefined) updateFields.quantity        = Number(quantity);
    if (supplierName    !== undefined) updateFields.supplierName    = supplierName.trim();
    if (supplierContact !== undefined) updateFields.supplierContact = supplierContact.trim();
    if (supplierEmail   !== undefined) updateFields.supplierEmail   = supplierEmail.trim().toLowerCase();
    if (reorderThreshold !== undefined) updateFields.reorderThreshold = Number(reorderThreshold);

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ success: false, error: 'Not Found', message: 'Product not found.' });
    }

    res.status(200).json({ success: true, message: 'Product updated successfully.', data: product });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createProduct,
  getAllProducts,
  getProductByBarcode,
  getLowStockProducts,
  updateProduct,
};
